import asyncio
import time
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from app.services import market_data, screener
from app.services.finmind import finmind_service
from app.services.fundamentals import build_financial_report
from app.services.gemini import gemini_service
from app.services.strategy_models import build_deep_research_report

router = APIRouter()


def _key(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.replace("Bearer ", "") or None
    return None


async def _ai(coro):
    try:
        return await coro
    except ValueError as e:  # 沒有 API Key
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 分析失敗: {e}")


# ---------------------------------------------------------------- 資料來源診斷
@router.get("/health")
async def data_health():
    """逐一測試各資料來源，回傳可用性與延遲，方便判斷「資料為何不準/跑不出來」"""
    async def probe(name, coro):
        t0 = time.time()
        try:
            r = await asyncio.wait_for(coro, timeout=12)
            ok = bool(r)
            detail = None
            if ok and hasattr(r, "price"):
                detail = {"price": r.price, "source": r.source, "stale": r.stale}
            return {"source": name, "ok": ok, "latency_ms": round((time.time() - t0) * 1000), "detail": detail}
        except Exception as e:
            return {"source": name, "ok": False, "latency_ms": round((time.time() - t0) * 1000), "error": str(e)[:120]}

    from app.services.twse import twse_service
    results = await asyncio.gather(
        probe("TWSE 即時報價 (2330)", twse_service.fetch_realtime_quote("2330")),
        probe("Yahoo 台股 (2330.TW)", market_data._yahoo_quote("2330.TW", "2330", market_data.MarketType.TW)),
        probe("Yahoo 美股 (AAPL)", market_data._yahoo_quote("AAPL", "AAPL", market_data.MarketType.US)),
        probe("FinMind 日線 (2330)", market_data._finmind_bars("2330", 10)),
        probe("統一報價層 (6488 上櫃)", market_data.get_quote("6488")),
    )
    return {"sources": results, "all_ok": all(r["ok"] for r in results)}


# ---------------------------------------------------------------- 財報 / ETF 追蹤資訊
@router.get("/{symbol}/etf-info")
async def etf_info(symbol: str):
    from app.services.etf_info import build_etf_report
    return await build_etf_report(symbol)


@router.get("/{symbol}/financials")
async def financials(symbol: str):
    report = await build_financial_report(symbol)
    if not report.get("has_data"):
        raise HTTPException(status_code=404, detail=f"查無 {symbol} 的財報資料（ETF/指數沒有財報，或資料源暫時無回應）")
    return report


@router.get("/{symbol}/deep-report")
async def deep_report(symbol: str):
    """整合 Simply Wall St 五維雷達、財報狗杜邦/現金流分析、四大經典開源策略模型與最終多空結論裁決"""
    return await build_deep_research_report(symbol)


@router.post("/{symbol}/financial-advice")
async def financial_advice(symbol: str, authorization: Optional[str] = Header(None)):
    """AI 財報診斷與建議：指標由程式計算，AI 解讀"""
    report = await build_financial_report(symbol)
    if not report.get("has_data"):
        raise HTTPException(status_code=404, detail=f"查無 {symbol} 的財報資料")
    slim = {**report, "quarters": report["quarters"][:8]}
    advice = await _ai(gemini_service.financial_report_advice(symbol, slim, _key(authorization)))
    return {"symbol": symbol, "advice": advice, "scores": report["scores"], "flags": report["flags"]}


# ---------------------------------------------------------------- 推薦
@router.get("/recommend")
async def recommend(market: str = "tw", style: str = "balanced", sector: Optional[str] = None, top: int = 10,
                    universe: str = "curated"):
    if market not in ("tw", "us", "all") or style not in screener.STYLE_WEIGHTS or universe not in ("curated", "hot"):
        raise HTTPException(status_code=400, detail="market 需為 tw/us/all；style 需為 balanced/momentum/growth/chips；universe 需為 curated/hot")
    return await screener.recommend(market, style, sector, min(max(top, 1), 30), universe)


@router.post("/recommend/explain")
async def recommend_explain(market: str = "tw", style: str = "balanced", sector: Optional[str] = None,
                            universe: str = "curated", authorization: Optional[str] = Header(None)):
    data = await screener.recommend(market, style, sector, 5, universe)
    if not data["picks"]:
        raise HTTPException(status_code=404, detail="目前無法取得足夠資料產生推薦")
    brief = [{k: p[k] for k in ("symbol", "name", "industry", "price", "score", "scores", "signals",
                                "entry_zone", "stop_loss", "target", "volatility_pct")} for p in data["picks"]]
    text = await _ai(gemini_service.recommendation_rationale(brief, _key(authorization)))
    return {"rationale": text, "picks": data["picks"]}


# ---------------------------------------------------------------- 產業
@router.get("/industries")
async def industries():
    return await screener.industry_overview()


@router.get("/industries/{name}")
async def industry(name: str):
    d = await screener.industry_detail(name)
    if not d:
        raise HTTPException(status_code=404, detail=f"未知產業: {name}，可用: {', '.join(screener.SECTORS)}")
    return d


@router.post("/industries/{name}/report")
async def industry_report(name: str, authorization: Optional[str] = Header(None)):
    d = await screener.industry_detail(name)
    if not d:
        raise HTTPException(status_code=404, detail=f"未知產業: {name}")
    brief = [{k: m.get(k) for k in ("symbol", "name", "price", "change_pct", "ret_20d", "score",
                                    "revenue_yoy_3m", "signals")} for m in d["members"]]
    text = await _ai(gemini_service.industry_report(name, {"members": brief}, _key(authorization)))
    return {"industry": name, "report": text, "members": d["members"]}
