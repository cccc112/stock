import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)

class FinMindService:
    BASE_URL = "https://api.finmindtrade.com/api/v4/data"

    def __init__(self):
        settings = get_settings()
        self.token = settings.finmind_api_key

    async def _fetch_data(self, dataset: str, data_id: str, start_date: str, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        params = {
            "dataset": dataset,
            "data_id": data_id,
            "start_date": start_date
        }
        if end_date:
            params["end_date"] = end_date
        if self.token:
            params["token"] = self.token

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()
                if data.get("msg") == "success":
                    return data.get("data", [])
                else:
                    logger.error(f"FinMind API error: {data.get('msg')}")
                    return []
            except Exception as e:
                logger.error(f"Error fetching FinMind data ({dataset}): {e}")
                return []

    async def get_history(self, symbol: str, days: int = 90) -> List[Dict[str, Any]]:
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        return await self._fetch_data("TaiwanStockPrice", symbol, start_date)

    async def get_institutional_investors(self, symbol: str, days: int = 30) -> List[Dict[str, Any]]:
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        return await self._fetch_data("TaiwanStockInstitutionalInvestorsBuySell", symbol, start_date)
    async def get_monthly_revenue(self, symbol: str, months: int = 12) -> List[Dict[str, Any]]:
        start_date = (datetime.now() - timedelta(days=months*30)).strftime("%Y-%m-%d")
        return await self._fetch_data("TaiwanStockMonthRevenue", symbol, start_date)

    async def get_financial_statements(self, symbol: str, years: int = 3) -> List[Dict[str, Any]]:
        start_date = (datetime.now() - timedelta(days=years*365)).strftime("%Y-%m-%d")
        return await self._fetch_data("FinancialStatements", symbol, start_date)

    async def get_news(self, symbol: str, days: int = 30) -> List[Dict[str, Any]]:
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        return await self._fetch_data("TaiwanStockNews", symbol, start_date)

    async def get_stock_info(self) -> List[Dict[str, Any]]:
        # For TaiwanStockInfo, data_id is not required, we can leave it empty or send a dummy
        params = {
            "dataset": "TaiwanStockInfo"
        }
        if self.token:
            params["token"] = self.token

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.BASE_URL, params=params)
                response.raise_for_status()
                data = response.json()
                if data.get("msg") == "success":
                    return data.get("data", [])
                else:
                    logger.error(f"FinMind API error: {data.get('msg')}")
                    return []
            except Exception as e:
                logger.error(f"Error fetching TaiwanStockInfo: {e}")
                return []

finmind_service = FinMindService()
