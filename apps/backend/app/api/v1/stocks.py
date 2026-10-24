import logging
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any, Dict, List

import httpx
from fastapi import APIRouter, HTTPException

from app.models.schemas import StockQuote, KlineBar, OrderBook
from app.services import market_data
from app.services.twse import twse_service
from app.services.yahoo import yahoo_service
from app.services.finmind import finmind_service

logger = logging.getLogger(__name__)

router = APIRouter()


async def fetch_rss_news(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Google News RSS 即時備援，保證永遠有新聞且支援美股/台股"""
    try:
        url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                items = []
                for el in root.findall(".//item")[:limit]:
                    title = el.findtext("title") or ""
                    link = el.findtext("link") or ""
                    pub_date = el.findtext("pubDate") or ""
                    source = el.findtext("source") or "財經新聞"
                    items.append({
                        "title": title,
                        "link": link,
                        "date": pub_date,
                        "source": source,
                    })
                return items
    except Exception as e:
        logger.warning(f"fetch_rss_news failed for {query}: {e}")
    return []


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
    code, kind, _ = market_data.split_symbol(symbol)
    if kind != "TW":
        return []
    return await finmind_service.get_institutional_investors(code, days)


@router.get("/{symbol}/news")
async def get_news(symbol: str, days: int = 5):
    code, market, _ = market_data.split_symbol(symbol)
    news = []
    if market == "TW":
        try:
            news = await finmind_service.get_news(code, days)
        except Exception as e:
            logger.warning(f"finmind get_news failed: {e}")
            news = []

    # 若 FinMind 無資料、遇週末或為美股，以 Google News 即時財經 RSS 備援
    if not news:
        name = ""
        quote = await market_data.get_quote(symbol)
        if quote and quote.name:
            name = quote.name
        query = f"{code} {name}".strip()
        news = await fetch_rss_news(query)

    return news
