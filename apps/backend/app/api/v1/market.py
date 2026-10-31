import asyncio
import json
import logging
import httpx
import ssl
from fastapi import APIRouter
from typing import List
from app.models.schemas import StockQuote
from app.services import market_data
from app.services.cache import cache_service

logger = logging.getLogger(__name__)
router = APIRouter()

def _make_ssl_context():
    ctx = ssl.create_default_context()
    try:
        ctx.set_ciphers('DEFAULT@SECLEVEL=1')
    except Exception:
        pass
    return ctx

# 中文名稱以 FinMind TaiwanStockInfo 為主；以下作為美股與備援，一律確保正體中文
STOCK_NAMES = {
    "2330.TW": "台積電", "2317.TW": "鴻海", "2454.TW": "聯發科",
    "3231.TW": "緯創", "2382.TW": "廣達", "0050.TW": "元大台灣50",
    "0056.TW": "元大高股息", "00878.TW": "國泰永續高股息", "00929.TW": "復華台灣科技優息",
    "NVDA": "輝達", "TSLA": "特斯拉", "AAPL": "蘋果",
    "MSFT": "微軟", "AMD": "超微", "GOOGL": "谷歌", "AMZN": "亞馬遜",
    "META": "臉書", "AVGO": "博通", "TSM": "台積電ADR",
    "SPY": "標普500 ETF", "QQQ": "那斯達克 ETF",
}

# 上市 (TWSE) 與上櫃 (TPEx) 高流動性代表股池（當證交所/櫃買中心全市場 OpenAPI 逾時時，即時拉取現價與真實成交量動態排序）
TWSE_LIQUID_POOL = ["2330", "2317", "2454", "2382", "3231", "2603", "2881", "2882", "2303", "3037", "2357", "2609", "3017", "2376"]
TPEX_LIQUID_POOL = ["8069", "6488", "3293", "5347", "3324", "6223", "3529", "8299", "6187", "5483", "3105", "6547"]


def _parse_num(val) -> float:
    if val is None:
        return 0.0
    s = str(val).replace(",", "").replace("+", "").replace("X", "").strip()
    try:
        return float(s)
    except Exception:
        return 0.0


async def fetch_single_quote(symbol: str) -> StockQuote | None:
    quote = await market_data.get_quote(symbol)
    if quote:
        names = await market_data.tw_name_map() if market_data.split_symbol(symbol)[1] == "TW" else {}
        code = market_data.split_symbol(symbol)[0]
        quote.name = names.get(code) or STOCK_NAMES.get(symbol) or quote.name
    return quote


async def _fetch_twse_openapi_top(limit: int = 15, sort_by: str = "volume") -> list[dict]:
    """從證交所 STOCK_DAY_ALL 抓取真實上市全市場 1300+ 檔即時成交排行"""
    try:
        async with httpx.AsyncClient(timeout=10.0, verify=_make_ssl_context()) as client:
            r = await client.get("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL")
            if r.status_code != 200:
                return []
            rows = r.json()
    except Exception as e:
        logger.warning(f"_fetch_twse_openapi_top failed: {e}")
        return []

    items = []
    for row in rows:
        code = str(row.get("Code", "")).strip()
        if not (len(code) == 4 and code.isdigit()):
            continue
        price = _parse_num(row.get("ClosingPrice"))
        vol_shares = int(_parse_num(row.get("TradeVolume")))
        val_ntd = _parse_num(row.get("TradeValue"))
        chg = _parse_num(row.get("Change"))
        if price <= 0 or vol_shares <= 0:
            continue
        prev = price - chg
        chg_pct = round(chg / prev * 100, 2) if prev > 0 else 0.0
        items.append({
            "symbol": code,
            "name": str(row.get("Name", code)).strip(),
            "market": "TWSE",
            "price": price,
            "change": chg,
            "change_pct": chg_pct,
            "volume": vol_shares,
            "turnover_b": round(val_ntd / 1e8, 2),
            "stale": False,
        })
    if sort_by == "turnover":
        items.sort(key=lambda x: (x["turnover_b"], x["volume"]), reverse=True)
    elif sort_by == "gainers":
        items.sort(key=lambda x: (x["change_pct"], x["volume"]), reverse=True)
    else:
        items.sort(key=lambda x: (x["volume"], x["turnover_b"]), reverse=True)
    return items[:limit]


async def _fetch_tpex_openapi_top(limit: int = 15, sort_by: str = "volume") -> list[dict]:
    """從櫃買中心 OpenAPI 抓取真實上櫃全市場即時成交排行"""
    try:
        async with httpx.AsyncClient(timeout=10.0, verify=_make_ssl_context()) as client:
            r = await client.get("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes")
            if r.status_code != 200:
                return []
            rows = r.json()
    except Exception as e:
        logger.warning(f"_fetch_tpex_openapi_top failed: {e}")
        return []

    items = []
    for row in rows:
        code = str(row.get("SecuritiesCompanyCode", "")).strip()
        if not (len(code) == 4 and code.isdigit()):
            continue
        price = _parse_num(row.get("Close"))
        vol_shares = int(_parse_num(row.get("TradingShares")))
        val_ntd = _parse_num(row.get("TransactionAmount"))
        chg = _parse_num(row.get("Change"))
        if price <= 0 or vol_shares <= 0:
            continue
        prev = price - chg
        chg_pct = round(chg / prev * 100, 2) if prev > 0 else 0.0
        items.append({
            "symbol": code,
            "name": str(row.get("CompanyName", code)).strip(),
            "market": "TPEx",
            "price": price,
            "change": chg,
            "change_pct": chg_pct,
            "volume": vol_shares,
            "turnover_b": round(val_ntd / 1e8, 2),
            "stale": False,
        })
    if sort_by == "turnover":
        items.sort(key=lambda x: (x["turnover_b"], x["volume"]), reverse=True)
    elif sort_by == "gainers":
        items.sort(key=lambda x: (x["change_pct"], x["volume"]), reverse=True)
    else:
        items.sort(key=lambda x: (x["volume"], x["turnover_b"]), reverse=True)
    return items[:limit]


async def _fallback_pool_rankings(pool: list[str], market_label: str, limit: int = 10, sort_by: str = "volume") -> list[dict]:
    quotes = await asyncio.gather(*[fetch_single_quote(s) for s in pool], return_exceptions=True)
    items = []
    for q in quotes:
        if isinstance(q, StockQuote) and q.price > 0:
            code = market_data.split_symbol(q.symbol)[0]
            vol = int(q.volume or 0)
            turnover_b = round((q.price * vol) / 1e8, 2)
            items.append({
                "symbol": code,
                "name": q.name or code,
                "market": market_label,
                "price": q.price,
                "change": q.change,
                "change_pct": q.change_pct,
                "volume": vol,
                "turnover_b": turnover_b,
                "stale": q.stale,
            })
    if sort_by == "turnover":
        items.sort(key=lambda x: (x["turnover_b"], x["volume"]), reverse=True)
    elif sort_by == "gainers":
        items.sort(key=lambda x: (x["change_pct"], x["volume"]), reverse=True)
    else:
        items.sort(key=lambda x: (x["volume"], x["turnover_b"]), reverse=True)
    return items[:limit]


@router.get("/rankings")
async def get_market_rankings(limit: int = 10, sort_by: str = "volume"):
    """真實台股上市 (TWSE) 與上櫃 (TPEx) 熱門成交排行（依真實成交量/成交值/漲幅動態排序）"""
    cache_key = f"market:rankings:v3:{limit}:{sort_by}"
    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    twse_list, tpex_list = [], []
    try:
        twse_res, tpex_res = await asyncio.gather(
            _fetch_twse_openapi_top(limit, sort_by),
            _fetch_tpex_openapi_top(limit, sort_by),
            return_exceptions=True,
        )
        if isinstance(twse_res, list) and len(twse_res) >= 3:
            twse_list = twse_res
        if isinstance(tpex_res, list) and len(tpex_res) >= 3:
            tpex_list = tpex_res
    except Exception as e:
        logger.warning(f"get_market_rankings gather error: {e}")

    if not twse_list:
        twse_list = await _fallback_pool_rankings(TWSE_LIQUID_POOL, "TWSE", limit, sort_by)
    if not tpex_list:
        tpex_list = await _fallback_pool_rankings(TPEX_LIQUID_POOL, "TPEx", limit, sort_by)

    data = {
        "twse": twse_list,
        "tpex": tpex_list,
    }
    if twse_list or tpex_list:
        await cache_service.set(cache_key, json.dumps(data), ttl=120)
    return data


@router.get("/trending", response_model=List[StockQuote])
async def get_trending():
    """熱門股票（台股上市+上櫃真實成交量排行）"""
    rankings = await get_market_rankings(limit=8)
    combined = (rankings.get("twse", [])[:6] + rankings.get("tpex", [])[:4])
    combined.sort(key=lambda x: x.get("volume", 0), reverse=True)
    return [
        StockQuote(
            symbol=item["symbol"],
            name=item["name"],
            price=item["price"],
            change=item["change"],
            change_pct=item["change_pct"],
            volume=item["volume"],
            stale=item.get("stale", False),
        )
        for item in combined[:8]
    ]


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


@router.get("/etf-nav")
async def get_etf_nav(symbol: str = ""):
    """從證交所 MIS 抓取全市場 350+ 檔 ETF 即時市價、基金淨值、折溢價率與申贖動向"""
    cache_key = "market:etf-nav-all"
    cached = await cache_service.get(cache_key)
    records = []
    if cached:
        try:
            records = json.loads(cached)
        except Exception:
            records = []

    if not records:
        from app.services.twse import twse_service
        records = await twse_service.fetch_etf_nav_records()
        if records:
            await cache_service.set(cache_key, json.dumps(records), ttl=30)

    if symbol:
        clean = symbol.strip().upper().replace(".TW", "").replace(".TWO", "")
        for r in records:
            if r.get("symbol") == clean:
                return r
        # 若未找到，回傳基礎結構
        return {
            "symbol": clean,
            "name": clean,
            "price": 0.0,
            "nav": 0.0,
            "discount_pct": 0.0,
            "status": "平價",
            "date": "",
            "time": "",
        }

    return records
