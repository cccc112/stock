from fastapi import APIRouter, HTTPException
from typing import List
import asyncio
from app.models.schemas import StockQuote, KlineBar, OrderBook
from app.services.twse import twse_service
from app.services.yahoo import yahoo_service
from app.services.cache import cache_service

router = APIRouter()

@router.get("/{symbol}/quote", response_model=StockQuote)
async def get_quote(symbol: str):
    cached = await cache_service.get_quote_cache(symbol)
    if cached:
        return cached

    quote = None
    # Try TWSE first for Taiwan listed stocks (not indices like ^TWII)
    is_tw_stock = (symbol.isnumeric() or symbol.endswith('.TW') or symbol.endswith('.TWO')) and not symbol.startswith('^')
    if is_tw_stock:
        quote = await twse_service.fetch_realtime_quote(symbol)

    # Fallback: yfinance (handles US stocks, TW ETFs, and indices like ^TWII, ^GSPC)
    if not quote:
        loop = asyncio.get_event_loop()
        try:
            quote = await asyncio.wait_for(
                loop.run_in_executor(None, yahoo_service.get_quote, symbol),
                timeout=10.0
            )
        except asyncio.TimeoutError:
            pass

    if not quote:
        raise HTTPException(status_code=404, detail=f"Stock not found: {symbol}")

    await cache_service.set_quote_cache(symbol, quote)
    return quote

@router.get("/{symbol}/history", response_model=List[KlineBar])
async def get_history(symbol: str, period: str = "1mo", interval: str = "1d"):
    cached = await cache_service.get_kline_cache(symbol, f"{period}_{interval}")
    if cached:
        return cached
        
    try:
        bars = yahoo_service.get_history(symbol, period, interval)
        if bars:
            await cache_service.set_kline_cache(symbol, f"{period}_{interval}", bars)
        return bars
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}/orderbook", response_model=OrderBook)
async def get_orderbook(symbol: str):
    if not (symbol.isnumeric() or symbol.endswith('.TW') or symbol.endswith('.TWO')):
        raise HTTPException(status_code=400, detail="Orderbook only supported for TW stocks")
        
    ob = await twse_service.fetch_orderbook(symbol)
    if not ob:
        raise HTTPException(status_code=404, detail="Orderbook not found")
    return ob

from app.services.finmind import finmind_service

@router.get("/search", response_model=List[dict])
async def search_stocks(q: str):
    return yahoo_service.search(q)

@router.get("/{symbol}/financials")
async def get_financials(symbol: str, years: int = 3):
    return await finmind_service.get_financial_statements(symbol, years)

@router.get("/{symbol}/institutional")
async def get_institutional(symbol: str, days: int = 30):
    return await finmind_service.get_institutional_investors(symbol, days)

@router.get("/{symbol}/news")
async def get_news(symbol: str, days: int = 30):
    return await finmind_service.get_news(symbol, days)
