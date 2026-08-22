import asyncio
from fastapi import APIRouter
from typing import List
from app.models.schemas import StockQuote, MarketType
from app.services.twse import twse_service
from app.services.yahoo import yahoo_service
from app.services.cache import cache_service

router = APIRouter()

# Stock name mapping (to avoid calling yfinance info which is slow)
STOCK_NAMES = {
    "2330.TW": "台積電", "2317.TW": "鴻海", "2454.TW": "聯發科",
    "3231.TW": "緯創", "2382.TW": "廣達", "0050.TW": "元大台灣50",
    "0056.TW": "元大高股息", "00878.TW": "國泰永續高股息", "00929.TW": "復華台灣科技優息",
    "NVDA": "NVIDIA", "TSLA": "Tesla", "AAPL": "Apple",
    "MSFT": "Microsoft", "AMD": "AMD", "SPY": "S&P 500 ETF", "QQQ": "Nasdaq ETF",
}

async def fetch_single_quote(symbol: str) -> StockQuote | None:
    # Check memory cache first
    cached = await cache_service.get_quote_cache(symbol)
    if cached:
        return cached

    quote = None
    is_tw = symbol.isnumeric() or symbol.endswith('.TW') or symbol.endswith('.TWO')

    if is_tw:
        # Try TWSE first (fast, real-time during market hours)
        quote = await twse_service.fetch_realtime_quote(symbol)

    if not quote:
        # Fallback: yfinance (works 24/7 for both TW/US, but slightly delayed)
        try:
            quote = await asyncio.wait_for(
                loop.run_in_executor(None, yahoo_service.get_quote, symbol),
                timeout=3.0
            )
        except Exception:
            quote = None
            
    if not quote and (symbol.endswith('.TW') or symbol.isnumeric()):
        try:
            from app.services.finmind import finmind_service
            clean_sym = symbol.replace('.TW', '')
            fm_data = await finmind_service.get_history(clean_sym, days=5)
            if fm_data and len(fm_data) > 0:
                last_day = fm_data[-1]
                quote = StockQuote(
                    symbol=symbol,
                    name=symbol,
                    price=last_day.get("close", 0),
                    change=0,
                    change_pct=0,
                    volume=last_day.get("Trading_Volume", 0),
                    high=last_day.get("max", 0),
                    low=last_day.get("min", 0),
                    open=last_day.get("open", 0),
                    prev_close=last_day.get("close", 0),
                    market=MarketType.TW
                )
        except Exception:
            pass

    # Inject friendly name - always prefer our mapping over potentially garbled TWSE encoding
    if symbol in STOCK_NAMES:
        if quote:
            quote.name = STOCK_NAMES[symbol]
    elif quote and (not quote.name or quote.name == symbol):
        quote.name = symbol

    if quote:
        await cache_service.set_quote_cache(symbol, quote)

    return quote

@router.get("/trending", response_model=List[StockQuote])
async def get_trending():
    """熱門股票（台股 + 美股）"""
    tw_stocks = ["2330.TW", "2317.TW", "2454.TW", "3231.TW", "2382.TW"]
    us_stocks = ["NVDA", "TSLA", "AAPL", "MSFT", "AMD"]
    symbols = tw_stocks + us_stocks
    
    tasks = [fetch_single_quote(sym) for sym in symbols]
    quotes = await asyncio.gather(*tasks, return_exceptions=True)
    
    valid_quotes = [q for q in quotes if isinstance(q, StockQuote)]
    valid_quotes.sort(key=lambda x: x.volume if x.volume else 0, reverse=True)
    return valid_quotes

@router.get("/etfs", response_model=List[StockQuote])
async def get_etfs():
    """熱門 ETF"""
    symbols = ["0050.TW", "0056.TW", "00878.TW", "00929.TW", "SPY", "QQQ"]
    tasks = [fetch_single_quote(sym) for sym in symbols]
    quotes = await asyncio.gather(*tasks, return_exceptions=True)
    
    valid_quotes = [q for q in quotes if isinstance(q, StockQuote)]
    return valid_quotes
