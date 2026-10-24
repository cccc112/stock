import asyncio
import httpx
import time
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class FinMindService:
    BASE_URL = "https://api.finmindtrade.com/api/v4/data"

    def __init__(self):
        settings = get_settings()
        self.token = settings.finmind_api_key
        self._cache: Dict[Tuple, Tuple[float, List[Dict[str, Any]]]] = {}
        # 額度用完(HTTP 402/429)後暫停呼叫一段時間：直接用舊快取或回空，避免每個請求都白等重試
        self._blocked_until = 0.0

    @property
    def has_token(self) -> bool:
        return bool(self.token)

    @property
    def rate_limited(self) -> bool:
        return time.time() < self._blocked_until

    async def _fetch_data(self, dataset: str, data_id: Optional[str] = None, start_date: Optional[str] = None,
                          end_date: Optional[str] = None, ttl: int = 300,
                          timeout: float = 12.0) -> List[Dict[str, Any]]:
        key = (dataset, data_id, start_date, end_date)
        hit = self._cache.get(key)
        if hit and time.time() - hit[0] < ttl:
            return hit[1]
        if self.rate_limited:
            return hit[1] if hit else []

        params: Dict[str, Any] = {"dataset": dataset}
        if data_id:
            params["data_id"] = data_id
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        if self.token:
            params["token"] = self.token

        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.get(self.BASE_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("msg") == "success":
                        rows = data.get("data", [])
                        self._cache[key] = (time.time(), rows)
                        return rows
                    logger.error(f"FinMind API error ({dataset}): {data.get('msg')}")
                    break
                if response.status_code in (402, 429):
                    if not self.rate_limited:
                        logger.error("FinMind 額度/頻率限制，暫停呼叫 10 分鐘（請設定 FINMIND_API_KEY 以提高額度）")
                    self._blocked_until = time.time() + 600
                    break
                if response.status_code == 422:
                    logger.error(f"FinMind dataset 無效或參數錯誤: {dataset}")
                    break
            except Exception as e:
                logger.error(f"Error fetching FinMind data ({dataset}): {e}")
            await asyncio.sleep(0.5)
        # 失敗時退回舊快取(即使過期)，總比空白好
        return hit[1] if hit else []

    @staticmethod
    def _start(days: int) -> str:
        return (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    async def get_history(self, symbol: str, days: int = 90) -> List[Dict[str, Any]]:
        return await self._fetch_data("TaiwanStockPrice", symbol, self._start(days), ttl=300)

    async def get_institutional_investors(self, symbol: str, days: int = 30) -> List[Dict[str, Any]]:
        return await self._fetch_data("TaiwanStockInstitutionalInvestorsBuySell", symbol, self._start(days), ttl=900)

    async def get_monthly_revenue(self, symbol: str, months: int = 12) -> List[Dict[str, Any]]:
        return await self._fetch_data("TaiwanStockMonthRevenue", symbol, self._start(months * 31), ttl=3600)

    async def get_financial_statements(self, symbol: str, years: int = 3) -> List[Dict[str, Any]]:
        """損益表(季)，長格式: date / type / value / origin_name"""
        return await self._fetch_data("TaiwanStockFinancialStatements", symbol, self._start(years * 366), ttl=6 * 3600)

    async def get_balance_sheet(self, symbol: str, years: int = 2) -> List[Dict[str, Any]]:
        return await self._fetch_data("TaiwanStockBalanceSheet", symbol, self._start(years * 366), ttl=6 * 3600)

    async def get_cash_flows(self, symbol: str, years: int = 2) -> List[Dict[str, Any]]:
        return await self._fetch_data("TaiwanStockCashFlowsStatement", symbol, self._start(years * 366), ttl=6 * 3600)

    async def get_per(self, symbol: str, days: int = 400) -> List[Dict[str, Any]]:
        """每日本益比 / 股價淨值比 / 殖利率"""
        return await self._fetch_data("TaiwanStockPER", symbol, self._start(days), ttl=3600)

    async def get_dividends(self, symbol: str, years: int = 5) -> List[Dict[str, Any]]:
        return await self._fetch_data("TaiwanStockDividend", symbol, self._start(years * 366), ttl=12 * 3600)

    async def get_news(self, symbol: str, days: int = 5) -> List[Dict[str, Any]]:
        # TaiwanStockNews 只回傳 start_date「當天」的新聞（不支援區間，帶 end_date 會報錯），
        # 所以逐日並行抓近 N 天再合併；週末/假日當天可能沒資料，多抓幾天補足
        days = max(1, min(days, 10))
        dates = [(datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
        results = await asyncio.gather(
            *[self._fetch_data("TaiwanStockNews", symbol, d, ttl=600, timeout=15.0) for d in dates],
            return_exceptions=True,
        )
        seen, merged = set(), []
        for rows in results:
            if not isinstance(rows, list):
                continue
            for r in rows:
                k = r.get("link") or r.get("title")
                if k in seen:
                    continue
                seen.add(k)
                merged.append(r)
        return sorted(merged, key=lambda r: r.get("date", ""), reverse=True)

    async def get_stock_info(self) -> List[Dict[str, Any]]:
        return await self._fetch_data("TaiwanStockInfo", ttl=86400)


finmind_service = FinMindService()
