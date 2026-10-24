"""
財報分析 (Fundamentals)

台股: FinMind 損益表 / 資產負債表 / 月營收 / PER-PBR / 股利
美股: yfinance 季報

輸出統一格式的 dict，給前端顯示以及餵給 Gemini 做財報診斷。
所有比率都是程式算出來的，AI 只負責解讀，避免 AI 自己編造數字。
"""
import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.services import market_data
from app.services.cache import cache_service
from app.services.finmind import finmind_service

logger = logging.getLogger(__name__)


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def _ratio(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if a is None or not b:
        return None
    return a / b


def _pct(x: Optional[float], nd: int = 2) -> Optional[float]:
    return None if x is None else round(x * 100, nd)


def _qlabel(date: str) -> str:
    y, m = date[:4], int(date[5:7])
    return f"{y}Q{(m - 1) // 3 + 1}"


def _pivot(rows: List[dict]) -> Dict[str, Dict[str, float]]:
    out: Dict[str, Dict[str, float]] = {}
    for r in rows or []:
        t = r.get("type", "")
        if t.endswith("_per"):
            continue
        out.setdefault(r["date"], {})[t] = r.get("value")
    return out


def _dt(date: str) -> datetime:
    return datetime.strptime(date[:10], "%Y-%m-%d")


def _year_ago(date: str) -> str:
    return f"{int(date[:4]) - 1}{date[4:]}"


def _build_quarters(income: Dict[str, Dict[str, float]]) -> List[dict]:
    dates = sorted(income.keys())
    quarters = []
    for d in dates:
        r = income[d]
        rev, gp, op = r.get("Revenue"), r.get("GrossProfit"), r.get("OperatingIncome")
        ni, eps = r.get("IncomeAfterTaxes"), r.get("EPS")
        yago = income.get(_year_ago(d)) or next(
            (income[k] for k in dates if abs((_dt(d) - _dt(k)).days - 365) <= 10), {})
        prev = income[dates[dates.index(d) - 1]] if dates.index(d) > 0 else {}
        quarters.append({
            "date": d,
            "quarter": _qlabel(d),
            "revenue": rev,
            "gross_profit": gp,
            "operating_income": op,
            "net_income": ni,
            "eps": eps,
            "gross_margin": _pct(_ratio(gp, rev)),
            "operating_margin": _pct(_ratio(op, rev)),
            "net_margin": _pct(_ratio(ni, rev)),
            "revenue_yoy": _pct(_ratio(rev - yago["Revenue"], abs(yago["Revenue"])) if rev is not None and yago.get("Revenue") else None),
            "revenue_qoq": _pct(_ratio(rev - prev["Revenue"], abs(prev["Revenue"])) if rev is not None and prev.get("Revenue") else None),
            "eps_yoy": _pct(_ratio(eps - yago["EPS"], abs(yago["EPS"])) if eps is not None and yago.get("EPS") else None),
        })
    quarters.reverse()  # 新 -> 舊
    return quarters


def _monthly_revenue(rows: List[dict]) -> List[dict]:
    by = {(r["revenue_year"], r["revenue_month"]): r["revenue"] for r in rows or []}
    out = []
    for (y, m), rev in sorted(by.items(), reverse=True):
        ago = by.get((y - 1, m))
        out.append({"month": f"{y}-{m:02d}", "revenue": rev,
                    "yoy": _pct(_ratio(rev - ago, ago)) if ago else None})
    return out[:12]


async def _tw_report(code: str, yahoo_sym: Optional[str] = None) -> Dict[str, Any]:
    inc_rows, bal_rows, cf_rows, rev_rows, per_rows, div_rows = await asyncio.gather(
        finmind_service.get_financial_statements(code, 3),
        finmind_service.get_balance_sheet(code, 3),
        finmind_service.get_cash_flows(code, 3),
        finmind_service.get_monthly_revenue(code, 27),
        finmind_service.get_per(code, 800),
        finmind_service.get_dividends(code, 3),
        return_exceptions=True,
    )
    ok = lambda x: x if isinstance(x, list) else []  # noqa: E731
    income = _pivot(ok(inc_rows))
    quarters = _build_quarters(income)
    bs = _pivot(ok(bal_rows))
    cf = _pivot(ok(cf_rows))

    # 若 FinMind 因匿名頻率限制而缺少季損益或現金流，自動以 Yahoo Finance 台股季報補齊
    yf_fallback: Optional[Dict[str, Any]] = None
    if not quarters or not bs or not cf:
        try:
            ys = yahoo_sym or f"{code}.TW"
            yf_fallback = await _us_report(ys)
        except Exception:
            yf_fallback = None

    if not quarters and yf_fallback and yf_fallback.get("quarters"):
        quarters = yf_fallback["quarters"]

    # 為每季補上現金流 (營業現金流 OCF / 自由現金流 FCF / 獲利含金量) 與杜邦三因子
    for q in quarters:
        d = q["date"]
        c_row = cf.get(d) or {}
        b_row = bs.get(d) or {}
        ocf = c_row.get("CashFlowsFromOperatingActivities")
        if ocf is None:
            ocf = c_row.get("NetCashInflowFromOperatingActivities")
        capex_raw = c_row.get("PropertyAndPlantAndEquipment")
        capex = -abs(capex_raw) if capex_raw is not None else None
        fcf = (ocf + capex) if (ocf is not None and capex is not None) else ocf
        ni = q.get("net_income")
        q["ocf"] = ocf
        q["fcf"] = fcf
        q["ocf_to_ni"] = _pct(_ratio(ocf, ni), 1) if (ocf is not None and ni and ni > 0) else None

        # 單季杜邦因子
        ta = b_row.get("TotalAssets")
        eq = b_row.get("EquityAttributableToOwnersOfParent") or b_row.get("Equity")
        rev = q.get("revenue")
        q["asset_turnover_ann"] = round((rev * 4) / ta, 2) if (rev and ta and ta > 0) else None
        q["equity_multiplier"] = round(ta / eq, 2) if (ta and eq and eq > 0) else None
        q["roe_ann"] = _pct(_ratio((ni or 0) * 4, eq), 1) if (ni is not None and eq and eq > 0) else None

    # 資產負債表 (最新與去年同期，供 Piotroski F-Score 與杜邦分析使用)
    balance: Dict[str, Any] = {}
    dupont: Dict[str, Any] = {}
    if bs:
        bs_dates = sorted(bs.keys())
        d = bs_dates[-1]
        b = bs[d]
        b_prev = bs[bs_dates[-5]] if len(bs_dates) >= 5 else (bs[bs_dates[0]] if len(bs_dates) > 1 else {})
        ta = b.get("TotalAssets")
        eq = b.get("EquityAttributableToOwnersOfParent") or b.get("Equity")
        cur_cr = round(_ratio(b.get("CurrentAssets"), b.get("CurrentLiabilities")) or 0, 2) or None
        prev_cr = round(_ratio(b_prev.get("CurrentAssets"), b_prev.get("CurrentLiabilities")) or 0, 2) or None
        cur_dr = _pct(_ratio(b.get("Liabilities"), ta))
        prev_dr = _pct(_ratio(b_prev.get("Liabilities"), b_prev.get("TotalAssets")))
        balance = {
            "date": d,
            "total_assets": ta,
            "total_liabilities": b.get("Liabilities"),
            "equity": eq,
            "debt_ratio": cur_dr,
            "prev_debt_ratio": prev_dr,
            "current_ratio": cur_cr,
            "prev_current_ratio": prev_cr,
            "cash": b.get("CashAndCashEquivalents"),
            "inventory": b.get("Inventories"),
            "capital_stock": b.get("CapitalStock"),
            "prev_capital_stock": b_prev.get("CapitalStock"),
        }
        # 近四季稅後淨利 / 最新權益 ≈ ROE；並進行杜邦三因子拆解
        ttm_ni = sum(q["net_income"] or 0 for q in quarters[:4]) if len(quarters) >= 4 else None
        ttm_rev = sum(q["revenue"] or 0 for q in quarters[:4]) if len(quarters) >= 4 else None
        ttm_ocf = sum(q.get("ocf") or 0 for q in quarters[:4]) if len(quarters) >= 4 else None
        ttm_fcf = sum(q.get("fcf") or 0 for q in quarters[:4]) if len(quarters) >= 4 else None
        balance["roe_ttm"] = _pct(_ratio(ttm_ni, eq)) if ttm_ni else None
        balance["roa_ttm"] = _pct(_ratio(ttm_ni, ta)) if ttm_ni else None
        balance["ocf_ttm"] = ttm_ocf
        balance["fcf_ttm"] = ttm_fcf
        balance["ocf_to_ni_ttm"] = _pct(_ratio(ttm_ocf, ttm_ni), 1) if (ttm_ocf and ttm_ni and ttm_ni > 0) else None

        nm_ttm = _pct(_ratio(ttm_ni, ttm_rev), 2) if (ttm_ni and ttm_rev) else None
        at_ttm = round(_ratio(ttm_rev, ta) or 0, 2) if (ttm_rev and ta) else None
        em_ttm = round(_ratio(ta, eq) or 0, 2) if (ta and eq) else None
        driver = "獲利驅動型（高護城河/高毛利）"
        if (nm_ttm or 0) < 8 and (at_ttm or 0) >= 1.0:
            driver = "總資產週轉驅動型（薄利多銷/營運效率）"
        elif (em_ttm or 0) >= 2.8:
            driver = "財務槓桿驅動型（留意負債成本與現金流）"
        dupont = {
            "roe_ttm": balance["roe_ttm"],
            "net_margin_ttm": nm_ttm,
            "asset_turnover": at_ttm,
            "equity_multiplier": em_ttm,
            "driver": driver,
        }
    elif yf_fallback:
        balance = yf_fallback.get("balance") or {}
        dupont = yf_fallback.get("dupont") or {}

    if yf_fallback and yf_fallback.get("quarters"):
        yf_q_by_label = {yq["quarter"]: yq for yq in yf_fallback["quarters"]}
        for q in quarters:
            yq = yf_q_by_label.get(q["quarter"])
            if yq:
                if q.get("ocf") is None:
                    q["ocf"] = yq.get("ocf")
                if q.get("fcf") is None:
                    q["fcf"] = yq.get("fcf")
                if q.get("ocf_to_ni") is None:
                    q["ocf_to_ni"] = yq.get("ocf_to_ni")

    # 估值
    valuation: Dict[str, Any] = {}
    per = [r for r in ok(per_rows) if r.get("PER")]
    if per:
        latest = per[-1]
        hist = sorted(r["PER"] for r in per if r["PER"] > 0)
        rank = (sum(1 for x in hist if x <= latest["PER"]) / len(hist)) if hist else None
        valuation = {
            "date": latest["date"], "per": latest["PER"], "pbr": latest.get("PBR"),
            "dividend_yield": latest.get("dividend_yield"),
            "per_percentile": _pct(rank, 1),  # 目前本益比落在自身近年區間的百分位
            "per_min": hist[0] if hist else None, "per_max": hist[-1] if hist else None,
            "per_median": hist[len(hist) // 2] if hist else None,
        }

    # 股利 (近 12 個月公告現金股利)
    cash_div = sum(r.get("CashEarningsDistribution") or 0 for r in ok(div_rows)
                   if r.get("date", "") >= f"{datetime.now().year - 1}-{datetime.now().month:02d}-01")
    dividend = {"cash_dividend_12m": round(cash_div, 2)}

    return {"quarters": quarters, "monthly_revenue": _monthly_revenue(ok(rev_rows)),
            "balance": balance, "dupont": dupont, "valuation": valuation, "dividend": dividend}


async def _us_report(sym: str) -> Dict[str, Any]:
    def work():
        import yfinance as yf
        t = yf.Ticker(sym)
        inc = t.quarterly_income_stmt
        bs = t.quarterly_balance_sheet
        cf = getattr(t, "quarterly_cashflow", None)
        try:
            info = t.info or {}
        except Exception:
            info = {}
        return inc, bs, cf, info

    inc, bs, cf, info = await asyncio.wait_for(asyncio.to_thread(work), timeout=25)
    quarters: List[dict] = []
    if inc is not None and not inc.empty:
        cols = sorted(inc.columns)
        get = lambda col, *names: next((float(inc.loc[n, col]) for n in names if n in inc.index and inc.loc[n, col] == inc.loc[n, col]), None)  # noqa: E731
        by = {c.strftime("%Y-%m-%d"): {
            "Revenue": get(c, "Total Revenue", "Operating Revenue"), "GrossProfit": get(c, "Gross Profit"),
            "OperatingIncome": get(c, "Operating Income"), "IncomeAfterTaxes": get(c, "Net Income"),
            "EPS": get(c, "Diluted EPS", "Basic EPS")} for c in cols}
        quarters = _build_quarters(by)

    cf_by: Dict[str, dict] = {}
    if cf is not None and not cf.empty:
        for col in cf.columns:
            get_cf = lambda *names: next((float(cf.loc[n, col]) for n in names if n in cf.index and cf.loc[n, col] == cf.loc[n, col]), None)  # noqa: E731
            cf_by[col.strftime("%Y-%m-%d")] = {
                "ocf": get_cf("Operating Cash Flow", "Cash Flow From Continuing Operating Activities"),
                "fcf": get_cf("Free Cash Flow"),
                "capex": get_cf("Capital Expenditure"),
            }

    for q in quarters:
        c_row = cf_by.get(q["date"]) or {}
        ocf = c_row.get("ocf")
        fcf = c_row.get("fcf")
        if fcf is None and ocf is not None and c_row.get("capex") is not None:
            fcf = ocf - abs(c_row["capex"])
        ni = q.get("net_income")
        q["ocf"] = ocf
        q["fcf"] = fcf if fcf is not None else ocf
        q["ocf_to_ni"] = _pct(_ratio(ocf, ni), 1) if (ocf is not None and ni and ni > 0) else None

    balance: Dict[str, Any] = {}
    dupont: Dict[str, Any] = {}
    if bs is not None and not bs.empty:
        cols_bs = sorted(bs.columns)
        c = cols_bs[-1]
        g = lambda n: float(bs.loc[n, c]) if n in bs.index and bs.loc[n, c] == bs.loc[n, c] else None  # noqa: E731
        ta = g("Total Assets")
        eq = g("Stockholders Equity")
        balance = {"date": c.strftime("%Y-%m-%d"), "total_assets": ta,
                   "total_liabilities": g("Total Liabilities Net Minority Interest"),
                   "equity": eq,
                   "debt_ratio": _pct(_ratio(g("Total Liabilities Net Minority Interest"), ta)),
                   "current_ratio": round(_ratio(g("Current Assets"), g("Current Liabilities")) or 0, 2) or None,
                   "cash": g("Cash And Cash Equivalents"), "inventory": g("Inventory"),
                   "roe_ttm": _pct(info.get("returnOnEquity"))}
        ttm_ni = sum(q["net_income"] or 0 for q in quarters[:4]) if len(quarters) >= 4 else None
        ttm_rev = sum(q["revenue"] or 0 for q in quarters[:4]) if len(quarters) >= 4 else None
        ttm_ocf = sum(q.get("ocf") or 0 for q in quarters[:4]) if len(quarters) >= 4 else None
        ttm_fcf = sum(q.get("fcf") or 0 for q in quarters[:4]) if len(quarters) >= 4 else None
        if balance.get("roe_ttm") is None and ttm_ni and eq:
            balance["roe_ttm"] = _pct(_ratio(ttm_ni, eq))
        balance["roa_ttm"] = _pct(_ratio(ttm_ni, ta)) if (ttm_ni and ta) else None
        balance["ocf_ttm"] = ttm_ocf
        balance["fcf_ttm"] = ttm_fcf
        balance["ocf_to_ni_ttm"] = _pct(_ratio(ttm_ocf, ttm_ni), 1) if (ttm_ocf and ttm_ni and ttm_ni > 0) else None
        nm_ttm = _pct(_ratio(ttm_ni, ttm_rev), 2) if (ttm_ni and ttm_rev) else None
        at_ttm = round(_ratio(ttm_rev, ta) or 0, 2) if (ttm_rev and ta) else None
        em_ttm = round(_ratio(ta, eq) or 0, 2) if (ta and eq) else None
        dupont = {
            "roe_ttm": balance.get("roe_ttm"),
            "net_margin_ttm": nm_ttm,
            "asset_turnover": at_ttm,
            "equity_multiplier": em_ttm,
            "driver": "獲利驅動型（高護城河/高毛利）" if (nm_ttm or 0) >= 12 else "營運效率與規模驅動型",
        }
    dy = info.get("dividendYield")
    valuation = {"per": info.get("trailingPE"), "forward_per": info.get("forwardPE"), "pbr": info.get("priceToBook"),
                 "dividend_yield": (dy if dy and dy > 1 else (dy or 0) * 100) or None}
    return {"quarters": quarters, "monthly_revenue": [], "balance": balance, "dupont": dupont, "valuation": valuation,
            "dividend": {"cash_dividend_12m": info.get("dividendRate")}}


def _score(report: Dict[str, Any]) -> Dict[str, Any]:
    q = report.get("quarters") or []
    bal, val = report.get("balance") or {}, report.get("valuation") or {}
    flags: List[str] = []
    scores: Dict[str, Optional[float]] = {"profitability": None, "growth": None, "safety": None, "valuation": None}

    if q:
        cur = q[0]
        om = cur.get("operating_margin")
        if om is not None:
            s = 50 + (om - 10) * 2.5
            yago = next((x for x in q[1:6] if x["quarter"][4:] == cur["quarter"][4:] and x["quarter"] != cur["quarter"]), None)
            if yago and yago.get("operating_margin") is not None:
                d = om - yago["operating_margin"]
                s += _clamp(d * 2, -10, 10)
                flags.append(f"營業利益率 {om:.1f}%（年增 {d:+.1f} 個百分點）")
            scores["profitability"] = round(_clamp(s))
        yoy = cur.get("revenue_yoy")
        if yoy is not None:
            scores["growth"] = round(_clamp(50 + yoy))
            if yoy < 0:
                flags.append(f"單季營收年減 {abs(yoy):.1f}%")
            elif yoy > 20:
                flags.append(f"單季營收年增 {yoy:.1f}%")
        eyoy = cur.get("eps_yoy")
        if eyoy is not None and eyoy < -20:
            flags.append(f"EPS 年減 {abs(eyoy):.1f}%")
    dr = bal.get("debt_ratio")
    if dr is not None:
        s = 100 - (dr - 30) * 1.5
        cr = bal.get("current_ratio")
        if cr:
            s += _clamp((cr - 1.5) * 10, -15, 10)
            if cr < 1:
                flags.append(f"流動比率 {cr}（短期償債壓力）")
        scores["safety"] = round(_clamp(s))
        if dr > 65:
            flags.append(f"負債比 {dr:.1f}% 偏高（金融股除外）")
    pct = val.get("per_percentile")
    per = val.get("per")
    if pct is not None:
        scores["valuation"] = round(_clamp(100 - pct))
        if pct > 85:
            flags.append(f"本益比 {per} 位於自身近年 {pct:.0f} 百分位，估值偏貴")
        elif pct < 25:
            flags.append(f"本益比 {per} 位於自身近年 {pct:.0f} 百分位，估值偏低")
    elif per:
        scores["valuation"] = round(_clamp(100 - (per - 12) * 2.5))
    avail = [v for v in scores.values() if v is not None]
    scores["overall"] = round(sum(avail) / len(avail)) if avail else None
    report["scores"] = scores
    report["flags"] = flags
    return report


async def build_financial_report(symbol: str) -> Dict[str, Any]:
    key = f"fundamentals:{symbol}"
    cached = await cache_service.get(key)
    if cached:
        import json
        try:
            return json.loads(cached)
        except Exception:
            pass

    code, kind, yahoo_sym = market_data.split_symbol(symbol)
    try:
        body = await (_tw_report(code, yahoo_sym) if kind == "TW" else _us_report(code))
    except Exception as e:
        logger.warning("financial report %s failed: %s", symbol, e)
        body = {"quarters": [], "monthly_revenue": [], "balance": {}, "valuation": {}, "dividend": {}}

    report = {"symbol": symbol, "market": "TW" if kind == "TW" else "US",
              "name": (await market_data.tw_name_map()).get(code, code) if kind == "TW" else code,
              "generated_at": datetime.utcnow().isoformat(), **body}
    report = _score(report)
    report["has_data"] = bool(report["quarters"])
    if report["has_data"]:
        import json
        await cache_service.set(key, json.dumps(report, ensure_ascii=False, default=str), ttl=3600)
    return report
