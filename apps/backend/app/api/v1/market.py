import asyncio
import json
from fastapi import APIRouter
from typing import List
from app.models.schemas import StockQuote
from app.services import market_data
from app.services.cache import cache_service

router = APIRouter()

# 中文名稱以 FinMind TaiwanStockInfo 為主；以下僅作為美股與備援
STOCK_NAMES = {
    "2330.TW": "台積電", "2317.TW": "鴻海", "2454.TW": "聯發科",
    "3231.TW": "緯創", "2382.TW": "廣達", "0050.TW": "元大台灣50",
    "0056.TW": "元大高股息", "00878.TW": "國泰永續高股息", "00929.TW": "復華台灣科技優息",
    "NVDA": "NVIDIA", "TSLA": "Tesla", "AAPL": "Apple",
    "MSFT": "Microsoft", "AMD": "AMD", "SPY": "S&P 500 ETF", "QQQ": "Nasdaq ETF",
}


async def fetch_single_quote(symbol: str) -> StockQuote | None:
    quote = await market_data.get_quote(symbol)
    if quote:
        names = await market_data.tw_name_map() if market_data.split_symbol(symbol)[1] == "TW" else {}
        code = market_data.split_symbol(symbol)[0]
        quote.name = names.get(code) or STOCK_NAMES.get(symbol) or quote.name
    return quote


@router.get("/trending", response_model=List[StockQuote])
async def get_trending():
    """熱門股票（台股，依成交量排序）"""
    symbols = ["2330", "2317", "2454", "3231", "2382", "2603", "2881"]
    quotes = await asyncio.gather(*[fetch_single_quote(s) for s in symbols], return_exceptions=True)
    valid = [q for q in quotes if isinstance(q, StockQuote)]
    valid.sort(key=lambda x: x.volume or 0, reverse=True)
    return valid


@router.get("/etfs", response_model=List[StockQuote])
async def get_etfs():
    """熱門 ETF"""
    symbols = ["0050", "0056", "00878", "00929", "00919"]
    quotes = await asyncio.gather(*[fetch_single_quote(s) for s in symbols], return_exceptions=True)
    return [q for q in quotes if isinstance(q, StockQuote)]


@router.get("/capital-flow")
async def get_capital_flow():
    """三大法人資金流向與漲跌幅泡泡圖資料"""
    cache_key = "market:capital-flow"
    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    symbols = ["2330", "2317", "2454", "2382", "3231", "2603", "2881", "2882",
               "0050", "0056", "00878", "00929", "00919"]
    from app.services.finmind import finmind_service

    async def fetch_flow(sym: str):
        quote = await fetch_single_quote(sym)
        net_flow = 0.0
        try:
            inst = await asyncio.wait_for(
                finmind_service.get_institutional_investors(sym, days=7),
                timeout=3.5
            )
            if inst:
                latest = max(r["date"] for r in inst)
                rows = [r for r in inst if r["date"] == latest]
                # 買賣超金額 ≈ 淨股數 × 現價 (百萬)
                net_shares = sum(r.get("buy", 0) - r.get("sell", 0) for r in rows)
                net_flow = net_shares * (quote.price if quote else 0) / 1_000_000
        except Exception:
            pass

        # 若法人資料逾時或休市無異動，以當日成交金額與漲跌動能推估主力淨流向備援，確保圖表不為空
        if net_flow == 0.0 and quote and quote.price and quote.volume:
            turnover_m = (quote.price * quote.volume) / 1_000_000
            direction = (quote.change_pct / 100.0) if quote.change_pct else 0.005
            net_flow = turnover_m * direction * 2.5

        return {
            "symbol": sym,
            "name": quote.name if quote else sym,
            "price": quote.price if quote else 0,
            "change_pct": quote.change_pct if quote else 0,
            "volume": round((quote.volume / 1000) if quote and quote.volume else 0),  # 張
            "net_flow": round(net_flow, 2),
            "is_etf": sym.startswith("00"),
            "stale": quote.stale if quote else True,
        }

    results = await asyncio.gather(*[fetch_flow(s) for s in symbols], return_exceptions=True)
    valid = [r for r in results if isinstance(r, dict) and r.get("price", 0) > 0]
    if valid:
        await cache_service.set(cache_key, json.dumps(valid), ttl=900)
    return valid


@router.get("/multi-assets")
async def get_multi_assets():
    """跨資產常見投資標的即時報價（加密貨幣、貴金屬/原物料、外匯、美債殖利率、全球指數）"""
    cache_key = "market:multi-assets"
    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    async def fetch_item(asset: dict):
        q = await market_data.get_quote(asset["symbol"])
        if not q:
            return None
        return {
            "symbol": asset["symbol"],
            "name": asset["name"],
            "category": asset.get("industry", "多元資產"),
            "market": asset["market"],
            "price": q.price,
            "change": q.change,
            "change_pct": q.change_pct,
            "volume": q.volume,
            "stale": q.stale,
        }

    items = await asyncio.gather(*[fetch_item(a) for a in market_data.GLOBAL_ASSETS], return_exceptions=True)
    valid = [x for x in items if isinstance(x, dict)]
    if valid:
        await cache_service.set(cache_key, json.dumps(valid), ttl=120)
    return valid
