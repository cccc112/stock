from fastapi import APIRouter, HTTPException
from typing import List
import asyncio
from app.models.schemas import StockQuote, KlineBar, OrderBook
from app.services.twse import twse_service
from app.services.yahoo import yahoo_service
from app.services.cache import cache_service

from datetime import datetime
import logging
from app.models.schemas import MarketType

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/{symbol}/quote", response_model=StockQuote)
async def get_quote(symbol: str):
    cached = await cache_service.get_quote_cache(symbol)
    if cached:
        return cached

    quote = None
    is_tw_stock = (symbol.isnumeric() or symbol.endswith('.TW') or symbol.endswith('.TWO')) and not symbol.startswith('^')
    if is_tw_stock:
        try:
            quote = await twse_service.fetch_realtime_quote(symbol)
        except Exception as e:
            logger.warning(f"TWSE quote error for {symbol}: {e}")

    # Fallback 1: yfinance (handles US stocks, TW ETFs, and indices)
    if not quote:
        loop = asyncio.get_event_loop()
        try:
            quote = await asyncio.wait_for(
                loop.run_in_executor(None, yahoo_service.get_quote, symbol),
                timeout=4.0
            )
        except Exception:
            quote = None

    # Fallback 2: FinMind for TW stocks when market is closed or Yahoo is throttled
    if not quote and is_tw_stock:
        try:
            from app.services.finmind import finmind_service
            clean_sym = symbol.replace('.TW', '').replace('.TWO', '')
            fm_data = await finmind_service.get_history(clean_sym, days=5)
            if fm_data and len(fm_data) > 0:
                last_day = fm_data[-1]
                prev_day = fm_data[-2] if len(fm_data) > 1 else last_day
                price = float(last_day.get("close", 0))
                prev_close = float(prev_day.get("close", price))
                change = price - prev_close
                change_pct = (change / prev_close * 100) if prev_close else 0.0
                quote = StockQuote(
                    symbol=symbol,
                    name=symbol,
                    price=price,
                    change=change,
                    change_pct=change_pct,
                    volume=float(last_day.get("Trading_Volume", 0)),
                    high=float(last_day.get("max", price)),
                    low=float(last_day.get("min", price)),
                    open=float(last_day.get("open", price)),
                    prev_close=prev_close,
                    market=MarketType.TW,
                    timestamp=datetime.now()
                )
        except Exception as e:
            logger.warning(f"FinMind quote fallback error for {symbol}: {e}")

    if not quote:
        raise HTTPException(status_code=404, detail=f"Stock not found: {symbol}")

    await cache_service.set_quote_cache(symbol, quote)
    return quote

@router.get("/{symbol}/history", response_model=List[KlineBar])
async def get_history(symbol: str, period: str = "1mo", interval: str = "1d"):
    if period in ["1d", "5d"]:
        interval = "5m"
        
    cached = await cache_service.get_kline_cache(symbol, f"{period}_{interval}")
    if cached:
        return cached
        
    bars = []
    # 1. Try Yahoo Finance with safe timeout in executor
    try:
        loop = asyncio.get_event_loop()
        bars = await asyncio.wait_for(
            loop.run_in_executor(None, yahoo_service.get_history, symbol, period, interval),
            timeout=4.0
        )
    except Exception:
        bars = []

    # 2. Fallback: FinMind for TW stocks
    is_tw = (symbol.isnumeric() or symbol.endswith('.TW') or symbol.endswith('.TWO')) and not symbol.startswith('^')
    if (not bars or len(bars) == 0) and is_tw:
        try:
            from app.services.finmind import finmind_service
            clean_sym = symbol.replace('.TW', '').replace('.TWO', '')
            period_days = {"1d": 5, "5d": 10, "1mo": 35, "3mo": 100, "6mo": 190, "1y": 370}.get(period, 60)
            fm_data = await finmind_service.get_history(clean_sym, days=period_days)
            if fm_data:
                bars = [
                    KlineBar(
                        time=datetime.strptime(r['date'], "%Y-%m-%d"),
                        open=float(r['open']),
                        high=float(r['max']),
                        low=float(r['min']),
                        close=float(r['close']),
                        volume=float(r['Trading_Volume'])
                    )
                    for r in fm_data
                ]
        except Exception as e:
            logger.warning(f"FinMind history fallback error for {symbol}: {e}")

    if bars:
        await cache_service.set_kline_cache(symbol, f"{period}_{interval}", bars)
        return bars

    return []

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
