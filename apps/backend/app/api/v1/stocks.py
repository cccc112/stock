import json
import asyncio
from datetime import datetime
from email.utils import parsedate_to_datetime
from app.services.cache import cache_service
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

CHINESE_NAME_MAP = {
    "2330": "台積電", "2317": "鴻海", "2454": "聯發科", "2382": "廣達", "3231": "緯創",
    "2603": "長榮", "2881": "富邦金", "2882": "國泰金", "2891": "中信金", "2303": "聯電",
    "0050": "元大台灣50", "0056": "元大高股息", "00878": "國泰永續高股息", "00919": "群益精選高息",
    "00929": "復華台灣科技優息", "00940": "元大台灣價值高息", "00713": "元大高息低波",
    "NVDA": "輝達", "TSLA": "特斯拉", "AAPL": "蘋果", "MSFT": "微軟", "GOOGL": "谷歌",
    "AMZN": "亞馬遜", "META": "Meta", "AMD": "超微", "INTC": "英特爾", "AVGO": "博通",
    "SPY": "標普500", "QQQ": "那斯達克", "SOXX": "半導體ETF", "SMH": "費半ETF",
}


async def fetch_rss_news(query: str, limit: int = 25) -> List[Dict[str, Any]]:
    """Google News RSS 即時新聞引擎，保證抓取當日即時發布之重大財經快訊"""
    try:
        url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            if resp.status_code == 200:
                root = ET.fromstring(resp.content)
                items = []
                for el in root.findall(".//item")[:limit]:
                    title = el.findtext("title") or ""
                    link = el.findtext("link") or ""
                    pub_date = el.findtext("pubDate") or ""
                    source = el.findtext("source") or "即時快訊"
                    
                    # 標準化發布時間為 ISO 字串，確保前後端排序精確
                    date_str = pub_date
                    try:
                        dt = parsedate_to_datetime(pub_date)
                        date_str = dt.strftime("%Y-%m-%d %H:%M:%S")
                    except Exception:
                        pass

                    if title:
                        items.append({
                            "title": title,
                            "link": link,
                            "date": date_str,
                            "source": source,
                        })
                return items
    except Exception as e:
        logger.warning(f"fetch_rss_news failed for {query}: {e}")
    return []


@router.get("/search", response_model=List[dict])
async def search_stocks(q: str):
    """搜尋: 跨資產(加密貨幣/商品/匯率/債券/指數) + 台股全市場(上市/上櫃/興櫃/ETF，完全一致優先) + Yahoo 美股"""
    q = q.strip()
    if not q:
        return []
    qu = q.upper()
    ql = q.lower()
    ranked: List[tuple] = []
    seen = set()

    # 1. 跨資產常見投資標的 (Crypto / Gold / Oil / Forex / Bonds / Indices)
    for asset in market_data.GLOBAL_ASSETS:
        sym = asset["symbol"]
        name = asset["name"]
        aliases = [a.upper() for a in asset.get("aliases", [])]
        if qu == sym.upper() or qu in aliases or q == name:
            score = 0
        elif sym.upper().startswith(qu) or any(a.startswith(qu) for a in aliases) or ql in name.lower():
            score = 1
        else:
            continue
        seen.add(sym)
        ranked.append((score, 0, {
            "symbol": sym,
            "name": name,
            "market": asset["market"],
            "industry": asset.get("industry", "多元資產"),
        }))

    # 2. 台股全市場清單 (上市 / 上櫃 / 興櫃 / ETF)
    try:
        for r in await market_data.tw_stock_info():
            sid = r.get("stock_id", "")
            name = r.get("stock_name", "")
            if not sid or sid in seen:
                continue
            sid_u = sid.upper()
            name_l = name.lower()
            if sid_u == qu or name == q:
                score = 0
            elif sid_u.startswith(qu) or name_l.startswith(ql):
                score = 1
            elif qu in sid_u or ql in name_l:
                score = 2
            else:
                continue
            # 4 碼一般上市櫃與 00 開頭 ETF 排在權證(6碼)前面
            len_penalty = 0 if len(sid) <= 5 else 1
            seen.add(sid)
            ranked.append((score, len_penalty, {
                "symbol": sid,
                "name": name,
                "market": "TW",
                "industry": r.get("industry_category", ""),
            }))
    except Exception as e:
        logger.warning("local search failed: %s", e)

    ranked.sort(key=lambda x: (x[0], x[1], len(x[2]["name"])))
    results: List[dict] = [item[2] for item in ranked[:12]]

    # 3. 若為英文/美股查詢或本地結果較少，補充 Yahoo Finance 搜尋
    if len(results) < 6 or q.isascii():
        try:
            import asyncio
            remote = await asyncio.wait_for(asyncio.to_thread(yahoo_service.search, q), timeout=3.0)
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
    """即時多源新聞聚合：優先調用即時 Google News RSS，輔以 FinMind 與 Yahoo 財經，保證新聞當日即時性與秒級快取"""
    code, market, _ = market_data.split_symbol(symbol)
    code_upper = code.upper()
    cache_key = f"news_cache:{code_upper}"

    # 1. 優先命中 180 秒秒級快取，防止重複高頻調用導致延遲
    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    # 2. 獲取中文標準名稱建立搜尋關鍵字
    quote = await market_data.get_quote(symbol)
    name = quote.name if quote else ""
    chinese_name = CHINESE_NAME_MAP.get(code_upper, name)
    query = f"{code} {chinese_name}".strip() if chinese_name else code

    # 3. 並行獲取即時新聞 (優先抓取最新 Google 財經 RSS，並設定安全 timeout 防止卡頓)
    tasks = [
        fetch_rss_news(query, limit=25),
    ]

    if market == "TW":
        # 台股背景嘗試抓取 FinMind 新聞 (限制 2.5 秒超時，防止阻塞主流程)
        async def fetch_finmind_safe():
            try:
                return await asyncio.wait_for(finmind_service.get_news(code, days=3), timeout=2.5)
            except Exception:
                return []
        tasks.append(fetch_finmind_safe())
    else:
        # 美股補充 Yahoo Finance 即時搜尋
        async def fetch_yahoo_safe():
            try:
                async with httpx.AsyncClient(timeout=3.5) as client:
                    y_url = f"https://query2.finance.yahoo.com/v1/finance/search?q={code}&quotesCount=1&newsCount=15"
                    y_res = await client.get(y_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                    if y_res.status_code == 200:
                        items = []
                        for it in y_res.json().get("news", []):
                            t = it.get("title")
                            l = it.get("link")
                            pub = it.get("providerPublishTime")
                            src = it.get("publisher", "Yahoo財經")
                            if t and l:
                                d_str = datetime.fromtimestamp(pub).strftime("%Y-%m-%d %H:%M:%S") if pub else ""
                                items.append({"title": t, "link": l, "date": d_str, "source": src})
                        return items
            except Exception:
                return []
            return []
        tasks.append(fetch_yahoo_safe())

    results = await asyncio.gather(*tasks, return_exceptions=True)
    all_news = []
    seen_titles = set()

    for res in results:
        if isinstance(res, list):
            for it in res:
                title = it.get("title", "").strip()
                if not title or title in seen_titles:
                    continue
                seen_titles.add(title)
                all_news.append(it)

    # 4. 依照發布時間嚴格由最新到最舊排序，確保今日與最新消息排在最頂部
    def parse_item_time(it):
        d = it.get("date", "")
        if not d:
            return 0
        try:
            return parsedate_to_datetime(d).timestamp()
        except Exception:
            try:
                return datetime.fromisoformat(d).timestamp()
            except Exception:
                return 0

    all_news.sort(key=parse_item_time, reverse=True)
    final_news = all_news[:30]

    # 5. 寫入快取 180 秒 (3 分鐘)
    if final_news:
        try:
            await cache_service.set(cache_key, json.dumps(final_news), ttl=180)
        except Exception:
            pass

    return final_news
