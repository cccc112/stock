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

@router.get("/capital-flow")
async def get_capital_flow():
    """三大法人資金流向與漲跌幅泡泡圖資料"""
    
    # Check cache first
    import json
    cache_key = "market:capital-flow"
    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    symbols = ["2330.TW", "2317.TW", "2454.TW", "2382.TW", "3231.TW", "2603.TW", "2881.TW", "2882.TW", "0050.TW", "0056.TW", "00878.TW", "00929.TW", "00919.TW"]
    
    from app.services.finmind import finmind_service
    
    async def fetch_flow(sym):
        clean_sym = sym.replace('.TW', '')
        quote = await fetch_single_quote(sym)
        net_flow = 0
        try:
            inst_data = await finmind_service.get_institutional_investors(clean_sym, days=7)
            if inst_data:
                dates = set(r['date'] for r in inst_data)
                if dates:
                    latest_date = max(dates)
                    latest_data = [r for r in inst_data if r['date'] == latest_date]
                    net = sum(r.get('buy', 0) - r.get('sell', 0) for r in latest_data)
                    net_flow = net / 1000000  # 轉為百萬
        except Exception as e:
            pass
            
        return {
            "symbol": clean_sym,
            "name": STOCK_NAMES.get(sym, clean_sym),
            "price": quote.price if quote else 0,
            "change_pct": quote.change_pct if quote else 0,
            "volume": (quote.volume / 1000) if quote and quote.volume else 0,
            "net_flow": round(net_flow, 2),
            "is_etf": sym.startswith("00")
        }

    tasks = [fetch_flow(sym) for sym in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    valid_results = [r for r in results if isinstance(r, dict)]
    
    # Save to cache for 1 hour
    try:
        await cache_service.set(cache_key, json.dumps(valid_results), ttl=3600)
    except Exception:
        pass
        
    return valid_results
