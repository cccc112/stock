from fastapi import APIRouter, HTTPException
from typing import List
import logging

from app.models.schemas import StockQuote, KlineBar, OrderBook
from app.services import market_data
from app.services.twse import twse_service
from app.services.yahoo import yahoo_service
from app.services.finmind import finmind_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/search", response_model=List[dict])
async def search_stocks(q: str):
    """搜尋: 台股先比對本地(代碼/中文名稱)，再補 Yahoo 搜尋結果(含美股)"""
    q = q.strip()
    if not q:
        return []
    results: List[dict] = []
    seen = set()
    try:
        for r in await market_data.tw_stock_info():
            sid, name = r.get("stock_id", ""), r.get("stock_name", "")
            if sid.startswith(q) or q in name:
                if sid in seen:
                    continue
                seen.add(sid)
                results.append({"symbol": sid, "name": name, "market": "TW",
                                "industry": r.get("industry_category", "")})
                if len(results) >= 10:
                    break
    except Exception as e:
        logger.warning("local search failed: %s", e)
    try:
        import asyncio
        remote = await asyncio.wait_for(asyncio.to_thread(yahoo_service.search, q), timeout=6)
        for r in remote:
            if r["symbol"] not in seen and len(results) < 15:
                seen.add(r["symbol"])
                results.append(r)
    except Exception:
        pass
    return results


@router.get("/{symbol}/quote", response_model=StockQuote)
async def get_quote(symbol: str):
    quote = await market_data.get_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"所有資料來源皆無法取得報價: {symbol}")
    return quote


@router.get("/{symbol}/history", response_model=List[KlineBar])
async def get_history(symbol: str, period: str = "1mo", interval: str = "1d"):
    return await market_data.get_history(symbol, period, interval)


@router.get("/{symbol}/orderbook", response_model=OrderBook)
async def get_orderbook(symbol: str):
    code, kind, hint = market_data.split_symbol(symbol)
    if kind != "TW":
        raise HTTPException(status_code=400, detail="Orderbook only supported for TW stocks")
    exch = hint or await market_data.resolve_exchange(code)
    ob = await twse_service.fetch_orderbook(f"{code}.TWO" if exch == "otc" else code)
    if not ob:
        raise HTTPException(status_code=404, detail="Orderbook not found")
    return ob


@router.get("/{symbol}/financials")
async def get_financials(symbol: str, years: int = 3):
    """原始損益表(季) — 已改用有效的 FinMind dataset"""
    code = market_data.split_symbol(symbol)[0]
    return await finmind_service.get_financial_statements(code, years)


@router.get("/{symbol}/institutional")
async def get_institutional(symbol: str, days: int = 30):
    return await finmind_service.get_institutional_investors(market_data.split_symbol(symbol)[0], days)


@router.get("/{symbol}/news")
async def get_news(symbol: str, days: int = 30):
    return await finmind_service.get_news(market_data.split_symbol(symbol)[0], days)
