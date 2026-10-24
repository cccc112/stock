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


async def _tw_report(code: str) -> Dict[str, Any]:
    inc_rows, bal_rows, rev_rows, per_rows, div_rows = await asyncio.gather(
        finmind_service.get_financial_statements(code, 3),
        finmind_service.get_balance_sheet(code, 2),
        finmind_service.get_monthly_revenue(code, 27),
        finmind_service.get_per(code, 800),
        finmind_service.get_dividends(code, 3),
        return_exceptions=True,
    )
    ok = lambda x: x if isinstance(x, list) else []  # noqa: E731
    income = _pivot(ok(inc_rows))
    quarters = _build_quarters(income)

    # 資產負債表
    balance: Dict[str, Any] = {}
    bs = _pivot(ok(bal_rows))
    if bs:
        d = max(bs)
        b = bs[d]
        balance = {
            "date": d,
            "total_assets": b.get("TotalAssets"),
            "total_liabilities": b.get("Liabilities"),
            "equity": b.get("Equity"),
            "debt_ratio": _pct(_ratio(b.get("Liabilities"), b.get("TotalAssets"))),
            "current_ratio": round(_ratio(b.get("CurrentAssets"), b.get("CurrentLiabilities")) or 0, 2) or None,
            "cash": b.get("CashAndCashEquivalents"),
            "inventory": b.get("Inventories"),
        }
        # 近四季稅後淨利 / 最新權益 ≈ ROE
        ttm_ni = sum(q["net_income"] or 0 for q in quarters[:4]) if len(quarters) >= 4 else None
        eq = b.get("EquityAttributableToOwnersOfParent") or b.get("Equity")
        balance["roe_ttm"] = _pct(_ratio(ttm_ni, eq)) if ttm_ni else None

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
            "balance": balance, "valuation": valuation, "dividend": dividend}


async def _us_report(sym: str) -> Dict[str, Any]:
    def work():
        import yfinance as yf
        t = yf.Ticker(sym)
        inc = t.quarterly_income_stmt
        bs = t.quarterly_balance_sheet
        try:
            info = t.info or {}
        except Exception:
            info = {}
        return inc, bs, info

    inc, bs, info = await asyncio.wait_for(asyncio.to_thread(work), timeout=25)
    quarters: List[dict] = []
    if inc is not None and not inc.empty:
        cols = sorted(inc.columns)
        get = lambda col, *names: next((float(inc.loc[n, col]) for n in names if n in inc.index and inc.loc[n, col] == inc.loc[n, col]), None)  # noqa: E731
        by = {c.strftime("%Y-%m-%d"): {
            "Revenue": get(c, "Total Revenue", "Operating Revenue"), "GrossProfit": get(c, "Gross Profit"),
            "OperatingIncome": get(c, "Operating Income"), "IncomeAfterTaxes": get(c, "Net Income"),
            "EPS": get(c, "Diluted EPS", "Basic EPS")} for c in cols}
        quarters = _build_quarters(by)
    balance: Dict[str, Any] = {}
    if bs is not None and not bs.empty:
        c = sorted(bs.columns)[-1]
        g = lambda n: float(bs.loc[n, c]) if n in bs.index and bs.loc[n, c] == bs.loc[n, c] else None  # noqa: E731
        balance = {"date": c.strftime("%Y-%m-%d"), "total_assets": g("Total Assets"),
                   "total_liabilities": g("Total Liabilities Net Minority Interest"),
                   "equity": g("Stockholders Equity"),
                   "debt_ratio": _pct(_ratio(g("Total Liabilities Net Minority Interest"), g("Total Assets"))),
                   "current_ratio": round(_ratio(g("Current Assets"), g("Current Liabilities")) or 0, 2) or None,
                   "cash": g("Cash And Cash Equivalents"), "inventory": g("Inventory"),
                   "roe_ttm": _pct(info.get("returnOnEquity"))}
    dy = info.get("dividendYield")
    valuation = {"per": info.get("trailingPE"), "forward_per": info.get("forwardPE"), "pbr": info.get("priceToBook"),
                 "dividend_yield": (dy if dy and dy > 1 else (dy or 0) * 100) or None}
    return {"quarters": quarters, "monthly_revenue": [], "balance": balance, "valuation": valuation,
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

    code, kind, _ = market_data.split_symbol(symbol)
    try:
        body = await (_tw_report(code) if kind == "TW" else _us_report(code))
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
