"""
統一行情資料層 (Market Data Layer)

所有報價 / K 線 / 歷史 DataFrame 都經過這裡，避免各 API 自己寫備援而不一致。

台股: TWSE MIS (即時, 自動判斷上市/上櫃) -> Yahoo chart API -> FinMind (日線)
美股: Yahoo chart API -> yfinance
全部失敗: 回傳「上一次成功的資料」並標記 stale=True，而不是直接 404。
"""
import asyncio
import logging
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx
import pandas as pd

from app.models.schemas import KlineBar, MarketType, StockQuote
from app.services.cache import cache_service

logger = logging.getLogger(__name__)

_UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
}
MIS_URL = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp"
YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}"
YF_CHART2 = "https://query2.finance.yahoo.com/v8/finance/chart/{sym}"

_TW_CODE = re.compile(r"^\d{4,6}[A-Za-z]?$")

# 期間 -> Yahoo range / FinMind 天數
PERIOD_RANGE = {"1d": "1d", "5d": "5d", "1mo": "1mo", "3mo": "3mo", "6mo": "6mo",
                "1y": "1y", "2y": "2y", "3y": "5y", "5y": "5y", "10y": "10y", "ytd": "ytd", "max": "max"}
PERIOD_DAYS = {"1d": 5, "5d": 10, "1mo": 35, "3mo": 100, "6mo": 190, "1y": 370,
               "2y": 740, "3y": 1100, "5y": 1830, "10y": 3660}

_client: Optional[httpx.AsyncClient] = None
# 代碼 -> 'tse' | 'otc'
_exch_cache: Dict[str, str] = {}


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=httpx.Timeout(8.0, connect=4.0), headers=_UA,
                                    follow_redirects=True)
    return _client


async def _get_json(url: str, params: Optional[dict] = None, retries: int = 2) -> Optional[Any]:
    for attempt in range(retries):
        try:
            r = await _http().get(url, params=params)
            if r.status_code == 200:
                return r.json()
            if r.status_code in (404, 422):
                return None
        except Exception as e:
            logger.debug("GET %s failed (%s)", url, e)
        await asyncio.sleep(0.4 * (attempt + 1))
    return None


# ---------------------------------------------------------------- symbols
def split_symbol(symbol: str) -> Tuple[str, str, Optional[str]]:
    """回傳 (代碼, 市場 'TW'|'US'|'INDEX', 明確指定的交易所 'tse'|'otc'|None)"""
    s = symbol.strip().upper()
    if s.startswith("^"):
        return s, "INDEX", None
    if s.endswith(".TWO"):
        return s[:-4], "TW", "otc"
    if s.endswith(".TW"):
        return s[:-3], "TW", None  # .TW 常被誤用在上櫃股，仍需解析
    if _TW_CODE.match(s):
        return s, "TW", None
    return s, "US", None


def _safe_float(val: Any, default: float = 0.0) -> float:
    try:
        if val in (None, "", "-"):
            return default
        f = float(val)
        return f if f == f else default
    except (ValueError, TypeError):
        return default


# ---------------------------------------------------------------- TWSE MIS
def _parse_mis(info: dict, symbol: str) -> Optional[StockQuote]:
    prev_close = _safe_float(info.get("y"))
    # z=最新成交價；收盤後常為 "-"，此時用 pz(最後一筆成交價)；仍沒有才退到昨收
    price = _safe_float(info.get("z"))
    stale = False
    if price <= 0:
        price = _safe_float(info.get("pz"))
    if price <= 0:
        bid = _safe_float((info.get("b") or "").split("_")[0])
        ask = _safe_float((info.get("a") or "").split("_")[0])
        if bid > 0 and ask > 0:
            price = (bid + ask) / 2
    if price <= 0:
        price, stale = prev_close, True
    if price <= 0:
        return None
    change = price - prev_close if prev_close else 0.0
    return StockQuote(
        symbol=symbol,
        name=info.get("n") or symbol,
        price=price,
        change=change,
        change_pct=(change / prev_close * 100) if prev_close else 0.0,
        volume=_safe_float(info.get("v")) * 1000,  # MIS 單位為「張」，統一轉為股
        high=_safe_float(info.get("h"), price) or price,
        low=_safe_float(info.get("l"), price) or price,
        open=_safe_float(info.get("o"), price) or price,
        prev_close=prev_close or price,
        market=MarketType.TW,
        source="twse",
        stale=stale,
    )


async def _mis_quote(code: str, hint: Optional[str], symbol: str) -> Optional[StockQuote]:
    order = [hint or _exch_cache.get(code)] if (hint or code in _exch_cache) else ["tse", "otc"]
    order = [o for o in order if o] + [o for o in ("tse", "otc") if o not in order]
    for exch in order:
        data = await _get_json(MIS_URL, {"ex_ch": f"{exch}_{code}.tw", "json": "1", "delay": "0"}, retries=2)
        arr = (data or {}).get("msgArray") or []
        if not arr or not arr[0].get("n"):
            continue
        _exch_cache[code] = exch
        return _parse_mis(arr[0], symbol)
    return None


async def resolve_exchange(code: str) -> str:
    """判斷上市(tse)或上櫃(otc)；用於組 Yahoo 後綴 (.TW / .TWO)"""
    if code in _exch_cache:
        return _exch_cache[code]
    await _mis_quote(code, None, code)
    return _exch_cache.get(code, "tse")


# ---------------------------------------------------------------- Yahoo chart
async def _yahoo_chart(ysym: str, rng: str, interval: str) -> Optional[dict]:
    params = {"range": rng, "interval": interval, "includePrePost": "false", "events": "div,split"}
    for base in (YF_CHART, YF_CHART2):
        data = await _get_json(base.format(sym=ysym), params, retries=1)
        try:
            res = data["chart"]["result"][0]
            if res.get("timestamp"):
                return res
        except Exception:
            continue
    return None


def _chart_to_bars(res: dict, daily: bool = False) -> List[KlineBar]:
    meta = res.get("meta") or {}
    off = int(meta.get("gmtoffset") or 0)
    # Yahoo 在休市日會多給一根「複製前日收盤」的假日線；以最新成交時間為準，丟掉晚於它的日線
    session_date = (datetime.fromtimestamp(int(meta["regularMarketTime"]) + off, tz=timezone.utc).date()
                    if meta.get("regularMarketTime") else None)
    ts = res.get("timestamp") or []
    q = ((res.get("indicators") or {}).get("quote") or [{}])[0]
    bars = []
    for i, t in enumerate(ts):
        try:
            o, h, l, c = q["open"][i], q["high"][i], q["low"][i], q["close"][i]
        except (KeyError, IndexError):
            continue
        if None in (o, h, l, c) or c <= 0:
            continue
        v = (q.get("volume") or [0] * len(ts))[i] or 0
        ts_local = datetime.fromtimestamp(t + off, tz=timezone.utc).replace(tzinfo=None)
        if daily and session_date and ts_local.date() > session_date:
            continue
        if daily:
            ts_local = ts_local.replace(hour=0, minute=0, second=0, microsecond=0)
        bars.append(KlineBar(
            time=ts_local,
            open=float(o), high=float(h), low=float(l), close=float(c), volume=float(v)))
    return bars


async def _yahoo_quote(ysym: str, symbol: str, market: MarketType) -> Optional[StockQuote]:
    res = await _yahoo_chart(ysym, "5d", "1d")
    if not res:
        return None
    meta = res.get("meta") or {}
    bars = _chart_to_bars(res, daily=True)
    if not bars:
        return None
    price = _safe_float(meta.get("regularMarketPrice")) or bars[-1].close
    last_day = datetime.fromtimestamp(
        (meta.get("regularMarketTime") or 0) + int(meta.get("gmtoffset") or 0), tz=timezone.utc).date()
    # 日線最後一根若是今天(盤中)，昨收是倒數第二根；否則最後一根就是昨收
    if bars[-1].time.date() >= last_day and len(bars) > 1:
        prev_close = bars[-2].close
    else:
        prev_close = bars[-1].close if bars[-1].time.date() < last_day else (
            _safe_float(meta.get("chartPreviousClose")) or bars[-1].close)
    today = bars[-1] if bars[-1].time.date() >= last_day else None
    change = price - prev_close
    return StockQuote(
        symbol=symbol,
        name=meta.get("shortName") or meta.get("longName") or symbol,
        price=price,
        change=change,
        change_pct=(change / prev_close * 100) if prev_close else 0.0,
        volume=_safe_float(meta.get("regularMarketVolume")) or (today.volume if today else 0.0),
        high=_safe_float(meta.get("regularMarketDayHigh")) or (today.high if today else price),
        low=_safe_float(meta.get("regularMarketDayLow")) or (today.low if today else price),
        open=(today.open if today else price),
        prev_close=prev_close,
        market=market,
        source="yahoo",
    )


async def _yfinance_quote(symbol: str, market: MarketType) -> Optional[StockQuote]:
    def work():
        import yfinance as yf
        fi = yf.Ticker(symbol).fast_info
        price, prev = float(fi.last_price), float(fi.previous_close)
        return StockQuote(
            symbol=symbol, name=symbol, price=price, change=price - prev,
            change_pct=(price - prev) / prev * 100 if prev else 0.0,
            volume=float(fi.last_volume or 0), high=float(fi.day_high or price),
            low=float(fi.day_low or price), open=float(fi.open or price), prev_close=prev,
            market=market, source="yfinance")
    try:
        return await asyncio.wait_for(asyncio.to_thread(work), timeout=8)
    except Exception as e:
        logger.debug("yfinance quote %s failed: %s", symbol, e)
        return None


# ---------------------------------------------------------------- FinMind
async def _finmind_bars(code: str, days: int) -> List[KlineBar]:
    from app.services.finmind import finmind_service
    rows = await finmind_service.get_history(code, days=days)
    bars = []
    for r in rows or []:
        try:
            if float(r["close"]) <= 0:
                continue  # 停牌日
            bars.append(KlineBar(time=datetime.strptime(r["date"], "%Y-%m-%d"),
                                 open=float(r["open"]), high=float(r["max"]), low=float(r["min"]),
                                 close=float(r["close"]), volume=float(r["Trading_Volume"])))
        except (KeyError, ValueError, TypeError):
            continue
    return bars


def _quote_from_bars(bars: List[KlineBar], symbol: str, market: MarketType, source: str) -> Optional[StockQuote]:
    if not bars:
        return None
    last = bars[-1]
    prev = bars[-2].close if len(bars) > 1 else last.close
    return StockQuote(symbol=symbol, name=symbol, price=last.close, change=last.close - prev,
                      change_pct=(last.close - prev) / prev * 100 if prev else 0.0,
                      volume=last.volume, high=last.high, low=last.low, open=last.open,
                      prev_close=prev, market=market, source=source, stale=True)


# ---------------------------------------------------------------- public API
async def get_quote(symbol: str) -> Optional[StockQuote]:
    cached = await cache_service.get_quote_cache(symbol)
    if cached:
        return cached

    code, kind, hint = split_symbol(symbol)
    quote: Optional[StockQuote] = None

    if kind == "TW":
        quote = await _mis_quote(code, hint, symbol)
        if not quote:
            exch = await resolve_exchange(code)
            ysyms = [f"{code}.{'TWO' if exch == 'otc' else 'TW'}", f"{code}.{'TW' if exch == 'otc' else 'TWO'}"]
            for ys in ysyms:
                quote = await _yahoo_quote(ys, symbol, MarketType.TW)
                if quote:
                    break
        if not quote:
            quote = _quote_from_bars(await _finmind_bars(code, 10), symbol, MarketType.TW, "finmind")
        if quote:
            # 台股一律優先用中文名稱（Yahoo 備援來源的名稱是英文）
            quote.name = (await tw_name_map()).get(code) or quote.name
    else:
        market = MarketType.US
        quote = await _yahoo_quote(code, symbol, market) or await _yfinance_quote(code, market)

    if quote:
        await cache_service.set_quote_cache(symbol, quote)
        await cache_service.set(f"quote_last:{symbol}", quote.model_dump_json(), ttl=7 * 86400)
        return quote

    # 最後防線：回傳上次成功資料並標記過期
    raw = await cache_service.get(f"quote_last:{symbol}")
    if raw:
        try:
            q = StockQuote.model_validate_json(raw)
            q.stale = True
            q.source = f"{q.source}(cached)"
            return q
        except Exception:
            pass
    return None


async def get_history(symbol: str, period: str = "1mo", interval: str = "1d") -> List[KlineBar]:
    if period in ("1d", "5d") and interval == "1d":
        interval = "5m"
    key = f"{period}_{interval}"
    cached = await cache_service.get_kline_cache(symbol, key)
    if cached:
        return cached

    code, kind, hint = split_symbol(symbol)
    rng = PERIOD_RANGE.get(period, "3mo")
    if period == "1d":
        rng = "5d"  # Yahoo 對台股 range=1d 會回空，改抓 5 天再裁成最後一個交易日
    bars: List[KlineBar] = []

    if kind == "TW":
        exch = hint or await resolve_exchange(code)
        for ys in (f"{code}.{'TWO' if exch == 'otc' else 'TW'}", f"{code}.{'TW' if exch == 'otc' else 'TWO'}"):
            res = await _yahoo_chart(ys, rng, interval)
            if res:
                bars = _chart_to_bars(res, interval == "1d")
                break
        if not bars and interval == "1d":
            bars = await _finmind_bars(code, PERIOD_DAYS.get(period, 100))
    else:
        res = await _yahoo_chart(code, rng, interval)
        if res:
            bars = _chart_to_bars(res, interval == "1d")
        if not bars:
            def work():
                import yfinance as yf
                df = yf.Ticker(code).history(period=rng, interval=interval)
                return [KlineBar(time=i.to_pydatetime().replace(tzinfo=None), open=float(r.Open),
                                 high=float(r.High), low=float(r.Low), close=float(r.Close),
                                 volume=float(r.Volume)) for i, r in df.iterrows()]
            try:
                bars = await asyncio.wait_for(asyncio.to_thread(work), timeout=12)
            except Exception as e:
                logger.debug("yfinance history %s failed: %s", symbol, e)

    if bars and period == "1d" and interval != "1d":
        last_day = bars[-1].time.date()
        bars = [b for b in bars if b.time.date() == last_day]

    if bars:
        # 日線快取 10 分鐘，盤中分K 60 秒
        await cache_service.set(f"kline:{symbol}:{key}", _dump_bars(bars), ttl=600 if interval == "1d" else 60)
    return bars


def _dump_bars(bars: List[KlineBar]) -> str:
    import json
    return json.dumps([b.model_dump() for b in bars], default=str)


async def get_df(symbol: str, period: str = "3mo") -> Optional[pd.DataFrame]:
    """量化用日線 DataFrame: date/open/high/low/close/volume"""
    bars = await get_history(symbol, period, "1d")
    if not bars:
        return None
    return pd.DataFrame([{
        "date": b.time.strftime("%Y-%m-%d"), "open": b.open, "high": b.high,
        "low": b.low, "close": b.close, "volume": b.volume} for b in bars])


# ---------------------------------------------------------------- 股票基本資料
_info_cache: Tuple[float, List[dict]] = (0.0, [])


async def tw_stock_info() -> List[dict]:
    """FinMind TaiwanStockInfo (名稱 / 產業別)，快取一天"""
    global _info_cache
    ts, data = _info_cache
    if data and time.time() - ts < 86400:
        return data
    from app.services.finmind import finmind_service
    rows = await finmind_service.get_stock_info()
    if rows:
        # 同一檔股票會有多筆(不同日期)，保留最新一筆；順便記下上市/上櫃
        latest: Dict[str, dict] = {}
        for r in rows:
            sid = r.get("stock_id")
            if sid and (sid not in latest or r.get("date", "") >= latest[sid].get("date", "")):
                latest[sid] = r
        rows = list(latest.values())
        for r in rows:
            if r.get("type") in ("twse", "tpex"):
                _exch_cache.setdefault(r["stock_id"], "otc" if r["type"] == "tpex" else "tse")
        _info_cache = (time.time(), rows)
        return rows
    return data


async def tw_name_map() -> Dict[str, str]:
    return {r["stock_id"]: r.get("stock_name", "") for r in await tw_stock_info() if r.get("stock_id")}


async def tw_industry_map() -> Dict[str, str]:
    return {r["stock_id"]: r.get("industry_category", "") for r in await tw_stock_info() if r.get("stock_id")}
