import asyncio
from fastapi import APIRouter
from typing import List
from app.models.schemas import StockQuote
from app.services.twse import twse_service
from app.services.yahoo import yahoo_service
from app.services.cache import cache_service

router = APIRouter()

async def fetch_single_quote(symbol: str) -> StockQuote | None:
    cached = await cache_service.get_quote_cache(symbol)
    if cached:
        return cached

    quote = None
    if symbol.isnumeric() or symbol.endswith('.TW') or symbol.endswith('.TWO'):
        quote = await twse_service.fetch_realtime_quote(symbol)
        
    if not quote:
        loop = asyncio.get_event_loop()
        quote = await loop.run_in_executor(None, yahoo_service.get_quote, symbol)
        
    if quote:
        await cache_service.set_quote_cache(symbol, quote)
        
    return quote

@router.get("/trending", response_model=List[StockQuote])
async def get_trending():
    # Predefined trending stocks for TW and US
    tw_stocks = ["2330.TW", "2317.TW", "2454.TW", "3231.TW", "2382.TW"]
    us_stocks = ["NVDA", "TSLA", "AAPL", "MSFT", "AMD"]
    
    symbols = tw_stocks + us_stocks
    tasks = [fetch_single_quote(sym) for sym in symbols]
    quotes = await asyncio.gather(*tasks)
    
    valid_quotes = [q for q in quotes if q is not None]
    
    # Sort by volume descending
    valid_quotes.sort(key=lambda x: x.volume if x.volume else 0, reverse=True)
    return valid_quotes

@router.get("/etfs", response_model=List[StockQuote])
async def get_etfs():
    # Predefined popular ETFs
    symbols = ["0050.TW", "0056.TW", "00878.TW", "00929.TW", "SPY", "QQQ"]
    tasks = [fetch_single_quote(sym) for sym in symbols]
    quotes = await asyncio.gather(*tasks)
    
    valid_quotes = [q for q in quotes if q is not None]
    return valid_quotes
