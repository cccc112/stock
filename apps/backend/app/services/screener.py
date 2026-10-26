"""
股票推薦 (量化評分) 與產業研究

評分一律由程式用真實資料計算，AI 只用來解讀，不負責產生分數。
  技術面 tech   : 趨勢(均線)、動能(報酬/MACD)、RSI、量能
  籌碼面 chips  : 外資 + 投信近 5 日買賣超 / 成交量 (僅台股)
  成長面 growth : 近 3 個月營收 YoY (僅台股)
"""
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.services import market_data
from app.services.cache import cache_service
from app.services.finmind import finmind_service
from app.services.fundamentals import _monthly_revenue

logger = logging.getLogger(__name__)

# 產業 -> 代表個股 (流動性佳的大型/中型股，涵蓋多元主流板塊)。
SECTORS: Dict[str, List[str]] = {
    "半導體": ["2330", "2454", "2303", "3711", "2379", "3034", "3443", "3661", "3035", "6488"],
    "AI伺服器/電腦": ["2317", "2382", "3231", "6669", "2356", "2357", "2376", "2383"],
    "電子零組件/散熱": ["2308", "3037", "2368", "3017", "3324", "2327", "8996"],
    "重電綠能/電線電纜": ["1519", "1503", "1513", "1514", "1609", "6806"],
    "通訊網路/光通訊": ["2412", "3045", "4904", "2345", "5388", "3450", "4977"],
    "金融": ["2881", "2882", "2891", "2886", "2884", "2892", "2880", "5880"],
    "航運/航空": ["2603", "2609", "2615", "2618", "2610"],
    "塑化鋼鐵/原物料": ["1301", "1303", "1326", "2002", "1101", "1216"],
    "汽車/機器人自動化": ["2207", "2201", "1590", "2049", "2359", "4583"],
    "生技醫療": ["6446", "4743", "1760", "4128", "6547"],
    "美股科技": ["NVDA", "MSFT", "AAPL", "GOOGL", "AMZN", "META", "AVGO", "TSM"],
    "美股半導體": ["AMD", "INTC", "QCOM", "MU", "ASML", "AMAT", "ARM", "MRVL"],
}
US_SECTORS = {"美股科技", "美股半導體"}

STYLE_WEIGHTS = {
    "balanced": {"tech": 0.35, "chips": 0.35, "growth": 0.30},
    "momentum": {"tech": 0.70, "chips": 0.15, "growth": 0.15},
    "growth": {"tech": 0.20, "chips": 0.15, "growth": 0.65},
    "chips": {"tech": 0.20, "chips": 0.70, "growth": 0.10},
}

_sem = asyncio.Semaphore(10)


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return float(max(lo, min(hi, x)))


# ---------------------------------------------------------------- 技術面
def tech_metrics(df: pd.DataFrame) -> Optional[Dict[str, Any]]:
    if df is None or len(df) < 30:
        return None
    c, h, l, v = df["close"].astype(float), df["high"].astype(float), df["low"].astype(float), df["volume"].astype(float)
    ma5, ma20 = c.rolling(5).mean(), c.rolling(20).mean()
    ma60 = c.rolling(60).mean() if len(c) >= 60 else pd.Series([np.nan] * len(c))
    delta = c.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / 14, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / 14, adjust=False).mean()
    rsi = 100 - 100 / (1 + gain / loss.replace(0, np.nan))
    ema12, ema26 = c.ewm(span=12, adjust=False).mean(), c.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    hist = macd - macd.ewm(span=9, adjust=False).mean()
    tr = pd.concat([h - l, (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1 / 14, adjust=False).mean()

    last = float(c.iloc[-1])
    ret = lambda n: float(c.iloc[-1] / c.iloc[-1 - n] - 1) * 100 if len(c) > n else None  # noqa: E731
    vol_ratio = float(v.tail(5).mean() / v.tail(20).mean()) if v.tail(20).mean() > 0 else 1.0
    m = {
        "close": last, "ret_1d": ret(1), "ret_5d": ret(5), "ret_20d": ret(20), "ret_60d": ret(60),
        "ma5": float(ma5.iloc[-1]), "ma20": float(ma20.iloc[-1]),
        "ma60": None if np.isnan(ma60.iloc[-1]) else float(ma60.iloc[-1]),
        "rsi": float(rsi.iloc[-1]), "macd_hist": float(hist.iloc[-1]), "macd_hist_prev": float(hist.iloc[-2]),
        "atr": float(atr.iloc[-1]), "atr_pct": float(atr.iloc[-1] / last * 100),
        "vol_ratio": vol_ratio,
        "high_60": float(h.tail(60).max()),
    }

    score, sig = 20.0, []
    if last > m["ma20"]:
        score += 15; sig.append("站上月線")
    else:
        sig.append("跌破月線")
    if m["ma60"] is not None and m["ma20"] > m["ma60"]:
        score += 15; sig.append("月線>季線(多頭排列)")
    if m["ma5"] > m["ma20"]:
        score += 5
    r20 = m["ret_20d"] or 0
    score += _clamp(r20, -10, 20)
    if m["macd_hist"] > 0:
        score += 10; sig.append("MACD 柱狀體為正")
        if m["macd_hist"] > m["macd_hist_prev"]:
            score += 5; sig.append("MACD 動能增強")
    if 45 <= m["rsi"] <= 68:
        score += 15; sig.append(f"RSI {m['rsi']:.0f} 健康區")
    elif m["rsi"] > 75:
        score -= 10; sig.append(f"RSI {m['rsi']:.0f} 過熱")
    elif m["rsi"] < 30:
        score += 5; sig.append(f"RSI {m['rsi']:.0f} 超賣")
    if vol_ratio > 1.2 and (m["ret_1d"] or 0) > 0:
        score += 10; sig.append(f"量能放大 {vol_ratio:.1f} 倍且收紅")
    elif vol_ratio > 1.5 and (m["ret_1d"] or 0) < 0:
        score -= 5; sig.append("爆量收黑")
    if last >= m["high_60"] * 0.98:
        sig.append("逼近/突破 60 日高點")
    m["score"] = round(_clamp(score))
    m["signals"] = sig
    return m


# ---------------------------------------------------------------- 籌碼 / 成長 (台股)
async def chips_metrics(code: str, avg_price: float, vol_5d: float) -> Optional[Dict[str, Any]]:
    rows = await finmind_service.get_institutional_investors(code, days=14)
    if not rows:
        return None
    dates = sorted({r["date"] for r in rows})[-5:]
    focus = [r for r in rows if r["date"] in dates]
    def net(names):
        return sum((r.get("buy", 0) or 0) - (r.get("sell", 0) or 0) for r in focus if r.get("name") in names)
    foreign, trust = net({"Foreign_Investor", "Foreign_Dealer_Self"}), net({"Investment_Trust"})
    ratio = (foreign + trust) / (vol_5d or 1)  # 外資+投信淨買超佔市場 5 日成交量比重
    sig = []
    if foreign > 0:
        sig.append(f"外資近5日買超 {foreign / 1000:,.0f} 張")
    elif foreign < 0:
        sig.append(f"外資近5日賣超 {abs(foreign) / 1000:,.0f} 張")
    if trust > 0:
        sig.append(f"投信近5日買超 {trust / 1000:,.0f} 張")
    elif trust < 0:
        sig.append(f"投信近5日賣超 {abs(trust) / 1000:,.0f} 張")
    
    # 平滑量化評分：連續雙曲正切映射，避免所有個股全部被夾在 0 或 100 分
    # 比例為 +10% 淨買超約 78 分，+20% 約 88 分，雙資同步加分
    base_score = 50.0 + float(np.tanh(ratio * 7.5)) * 42.0
    if foreign > 0 and trust > 0:
        base_score += 8.0
        sig.append("土洋聯手同步買超")
    net_amt = (foreign + trust) * avg_price
    if net_amt > 1_000_000_000:
        base_score += 5.0
        sig.append(f"法人5日淨佈局逾 {net_amt / 100_000_000:,.1f} 億")
    elif net_amt < -1_000_000_000:
        base_score -= 8.0

    return {"foreign_5d": foreign, "trust_5d": trust, "net_amount_5d": net_amt,
            "score": round(_clamp(base_score, 5.0, 99.0)), "signals": sig}


async def growth_metrics(code: str) -> Optional[Dict[str, Any]]:
    rev = _monthly_revenue(await finmind_service.get_monthly_revenue(code, 16))
    yoys = [r["yoy"] for r in rev[:3] if r.get("yoy") is not None]
    if not yoys:
        return None
    avg = sum(yoys) / len(yoys)
    latest_yoy = rev[0]["yoy"] if rev and rev[0].get("yoy") is not None else avg
    sig = [f"近3個月營收年增均值 {avg:+.1f}%（{rev[0]['month']} 年增 {latest_yoy:+.1f}%）"]

    # 成長評分模型：以近 3 個月營收年增與最新單月動能為核心
    base_score = 50.0 + float(np.tanh(avg / 45.0)) * 36.0
    if latest_yoy > avg + 3:
        base_score += 8.0
        sig.append("最新單月營收動能加速超越近季平均")
    if latest_yoy > 30:
        base_score += 6.0
        sig.append("單月營收年增爆發突破 30%")

    return {"revenue_yoy_3m": round(avg, 1), "latest_month": rev[0]["month"], "latest_yoy": latest_yoy,
            "score": round(_clamp(base_score, 5.0, 99.0)),
            "signals": sig}


# ---------------------------------------------------------------- 單檔評估
def _industry_of(symbol: str) -> str:
    for name, syms in SECTORS.items():
        if symbol in syms:
            return name
    return ""


async def hot_universe(n: int = 60) -> List[str]:
    """全市場(上市+上櫃)當日成交值前 n 名的一般股票，作為動態股票池"""
    cached = await cache_service.get(f"universe:hot:{n}")
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass
    rows: List[tuple] = []  # (成交值, 代碼)
    import httpx
    async with httpx.AsyncClient(timeout=20, headers={"User-Agent": "Mozilla/5.0"}, follow_redirects=True) as c:
        async def grab(url: str, code_k: str, val_k: str, px_k: str):
            try:
                for r in (await c.get(url)).json():
                    code = str(r.get(code_k, ""))
                    if len(code) == 4 and code.isdigit() and not code.startswith("00"):
                        try:
                            if float(str(r.get(px_k, "0")).replace(",", "") or 0) >= 10:
                                rows.append((float(str(r.get(val_k, "0")).replace(",", "") or 0), code))
                        except ValueError:
                            continue
            except Exception as e:
                logger.warning("hot universe source failed (%s): %s", url, e)
        await asyncio.gather(
            grab("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", "Code", "TradeValue", "ClosingPrice"),
            grab("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes", "SecuritiesCompanyCode", "TransactionAmount", "Close"),
        )
    codes = [code for _, code in sorted(rows, reverse=True)[:n]]
    if codes:
        await cache_service.set(f"universe:hot:{n}", json.dumps(codes), ttl=1800)
    return codes


async def evaluate(symbol: str, with_chips: bool = True, with_growth: bool = True) -> Optional[Dict[str, Any]]:
    async with _sem:
        df = await market_data.get_df(symbol, "6mo")
        t = tech_metrics(df)
        if not t:
            return None
        code, kind, _ = market_data.split_symbol(symbol)
        chips = growth = None
        if kind == "TW":
            if with_chips:
                chips = await chips_metrics(code, t["close"], float(df["volume"].tail(5).sum()))
            if with_growth:
                growth = await growth_metrics(code)
        name = (await market_data.tw_name_map()).get(code, code) if kind == "TW" else code
    return {"symbol": symbol, "code": code, "name": name, "market": "TW" if kind == "TW" else "US",
            "industry": _industry_of(code) or (await market_data.tw_industry_map()).get(code, "") if kind == "TW" else "",
            "tech": t, "chips": chips, "growth": growth}


def composite(ev: Dict[str, Any], style: str = "balanced") -> Dict[str, Any]:
    t = ev["tech"]
    chips = ev.get("chips")
    growth = ev.get("growth")
    tech_score = float(t["score"])
    chips_score = float(chips["score"]) if chips else tech_score
    growth_score = float(growth["score"]) if growth else tech_score

    # 針對四大投資哲學風格量身定制量化評分演算法
    if style == "momentum":
        # 動能型：以短中期價格趨勢、突破力道與成交量放大為核心
        mom = 45.0
        r20 = t.get("ret_20d") or 0
        r5 = t.get("ret_5d") or 0
        mom += _clamp(r20 * 1.5, -25, 30)  # 20日強勢度
        mom += _clamp(r5 * 1.2, -12, 18)   # 5日短線衝力
        if t["close"] >= t["high_60"] * 0.97:
            mom += 15  # 逼近或創60日新高
        if t["vol_ratio"] >= 1.2:
            mom += min(15, (t["vol_ratio"] - 1.0) * 12)  # 帶量突破
        if t["ma5"] > t["ma20"] and (t.get("ma60") and t["ma20"] > t["ma60"]):
            mom += 12  # 多頭排列
        if 52 <= t["rsi"] <= 74:
            mom += 10  # 動能黃金區
        if t["macd_hist"] > 0 and t["macd_hist"] > t["macd_hist_prev"]:
            mom += 8   # MACD 柱狀增長
        total = round(_clamp(mom * 0.75 + chips_score * 0.15 + growth_score * 0.10))

    elif style == "growth":
        # 成長型：以營收爆發率與年增加速為主軸，搭配均線多頭
        gw = 42.0
        yoy3m = growth["revenue_yoy_3m"] if growth else (t.get("ret_20d") or 0)
        gw += float(np.tanh(yoy3m / 35.0)) * 40.0
        if growth and growth.get("latest_yoy", 0) > growth.get("revenue_yoy_3m", 0):
            gw += 12  # 最新月份年增加速
        if t["close"] >= t["ma20"]:
            gw += 10  # 股價位於月線之上
        if t.get("ma60") and t["close"] >= t["ma60"]:
            gw += 8   # 股價位於季線之上
        total = round(_clamp(gw * 0.65 + tech_score * 0.20 + chips_score * 0.15))

    elif style == "chips":
        # 籌碼型：以法人大戶籌碼連續性集中度為第一要素
        cp = chips_score * 0.70 + tech_score * 0.20 + growth_score * 0.10
        total = round(_clamp(cp))

    else:
        # 均衡型 (balanced)：技術 35%、籌碼 35%、成長 30% 平衡配置
        w = STYLE_WEIGHTS.get(style, STYLE_WEIGHTS["balanced"])
        parts = {
            "tech": tech_score,
            "chips": chips_score if chips else None,
            "growth": growth_score if growth else None
        }
        used = {k: v for k, v in parts.items() if v is not None}
        wsum = sum(w[k] for k in used)
        total = round(sum(parts[k] * w[k] for k in used) / wsum) if wsum else round(tech_score)

    atr = t["atr"]
    action = "強勢標的，可分批佈局" if total >= 75 else "條件不錯，拉回找買點" if total >= 62 else "中性，觀望" if total >= 48 else "偏弱，不建議追"
    sigs = list(t["signals"])
    for k in ("chips", "growth"):
        if ev.get(k):
            sigs += ev[k]["signals"]
    return {
        "symbol": ev["symbol"], "code": ev["code"], "name": ev["name"], "market": ev["market"],
        "industry": ev["industry"], "price": round(t["close"], 2),
        "change_pct": round(t["ret_1d"] or 0, 2), "ret_20d": round(t["ret_20d"] or 0, 2),
        "score": total,
        "scores": {
            "tech": round(tech_score),
            "chips": round(chips_score) if chips else None,
            "growth": round(growth_score) if growth else None
        },
        "action": action, "signals": sigs,
        # 以 ATR 估算的參考價位：拉回至月線附近承接，停損 2 ATR，目標 3 ATR（報酬風險比 1.5）
        "entry_zone": [round(max(min(t["ma20"], t["close"]), t["close"] - atr), 2), round(t["close"], 2)],
        "stop_loss": round(t["close"] - 2 * atr, 2), "target": round(t["close"] + 3 * atr, 2),
        "volatility_pct": round(t["atr_pct"], 2), "rsi": round(t["rsi"], 1),
    }


async def recommend(market: str = "tw", style: str = "balanced", sector: Optional[str] = None,
                    top: int = 10, universe: str = "curated", refresh: bool = False) -> Dict[str, Any]:
    """universe: curated = 內建各產業代表股；hot = 全市場當日成交值前 60 名"""
    key = f"recommend:{market}:{style}:{sector or '-'}:{universe}"
    cached = None if refresh else await cache_service.get(key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass
    symbols: List[str] = []
    if universe == "hot" and market != "us":
        symbols = await hot_universe(60)
    else:
        for name, syms in SECTORS.items():
            if sector and name != sector:
                continue
            is_us = name in US_SECTORS
            if (market == "tw" and is_us) or (market == "us" and not is_us):
                continue
            symbols += syms
    symbols = list(dict.fromkeys(symbols))
    evs = await asyncio.gather(*[evaluate(s) for s in symbols], return_exceptions=True)
    picks = sorted((composite(e, style) for e in evs if isinstance(e, dict)), key=lambda x: x["score"], reverse=True)
    notes = []
    if finmind_service.rate_limited or not finmind_service.has_token:
        if finmind_service.rate_limited:
            logger.info("FinMind 額度用完，本次評分僅採技術面")
    result = {"notes": notes, "market": market, "style": style, "sector": sector, "universe_type": universe, "universe": len(symbols),
              "evaluated": len(picks), "picks": picks[:top], "all_picks": picks,
              "avoid": [p for p in picks if p["score"] < 45][-5:],
              "generated_at": pd.Timestamp.utcnow().isoformat()}
    if picks:
        await cache_service.set(key, json.dumps(result, ensure_ascii=False, default=str), ttl=1200)
    return result


# ---------------------------------------------------------------- 產業
async def industry_overview(refresh: bool = False) -> Dict[str, Any]:
    cached = None if refresh else await cache_service.get("industry:overview")
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    async def one(sym: str):
        async with _sem:
            df = await market_data.get_df(sym, "6mo")
        return sym, tech_metrics(df)

    allsyms = list(dict.fromkeys(s for v in SECTORS.values() for s in v))
    res = dict(r for r in await asyncio.gather(*[one(s) for s in allsyms], return_exceptions=True) if isinstance(r, tuple))
    names = await market_data.tw_name_map()
    out = []
    for sector, syms in SECTORS.items():
        ms = [(s, res.get(s)) for s in syms if res.get(s)]
        if not ms:
            continue
        avg = lambda k: round(float(np.mean([m[k] for _, m in ms if m.get(k) is not None])), 2)  # noqa: E731
        best = max(ms, key=lambda x: x[1]["ret_20d"] or -999)
        worst = min(ms, key=lambda x: x[1]["ret_20d"] or 999)
        out.append({
            "industry": sector, "market": "US" if sector in US_SECTORS else "TW", "members": len(ms),
            "ret_1d": avg("ret_1d"), "ret_5d": avg("ret_5d"), "ret_20d": avg("ret_20d"), "ret_60d": avg("ret_60d"),
            "breadth_up_pct": round(sum(1 for _, m in ms if (m["ret_1d"] or 0) > 0) / len(ms) * 100),
            "above_ma20_pct": round(sum(1 for _, m in ms if m["close"] > m["ma20"]) / len(ms) * 100),
            "avg_tech_score": round(float(np.mean([m["score"] for _, m in ms]))),
            "leader": {"symbol": best[0], "name": names.get(best[0], best[0]), "ret_20d": round(best[1]["ret_20d"], 2)},
            "laggard": {"symbol": worst[0], "name": names.get(worst[0], worst[0]), "ret_20d": round(worst[1]["ret_20d"], 2)},
        })
    out.sort(key=lambda x: x["ret_20d"], reverse=True)
    result = {"industries": out, "generated_at": pd.Timestamp.utcnow().isoformat()}
    if out:
        await cache_service.set("industry:overview", json.dumps(result, ensure_ascii=False), ttl=900)
    return result


async def industry_detail(name: str) -> Optional[Dict[str, Any]]:
    syms = SECTORS.get(name)
    if not syms:
        return None
    evs = await asyncio.gather(*[evaluate(s) for s in syms], return_exceptions=True)
    members = [composite(e) for e in evs if isinstance(e, dict)]
    members.sort(key=lambda x: x["score"], reverse=True)
    growth = {}
    for e in evs:
        if isinstance(e, dict) and e.get("growth"):
            growth[e["symbol"]] = e["growth"]["revenue_yoy_3m"]
    for m in members:
        m["revenue_yoy_3m"] = growth.get(m["symbol"])
    return {"industry": name, "market": "US" if name in US_SECTORS else "TW", "members": members}
