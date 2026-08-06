import json
import redis.asyncio as redis
from typing import Optional, List
from app.core.config import get_settings
from app.models.schemas import StockQuote, KlineBar

import redis.exceptions

class CacheService:
    def __init__(self):
        settings = get_settings()
        self.redis = redis.from_url(settings.redis_url, decode_responses=True)

    async def get(self, key: str) -> Optional[str]:
        try:
            return await self.redis.get(key)
        except redis.exceptions.ConnectionError:
            return None

    async def set(self, key: str, value: str, ttl: int):
        try:
            await self.redis.set(key, value, ex=ttl)
        except redis.exceptions.ConnectionError:
            pass

    async def delete(self, key: str):
        try:
            await self.redis.delete(key)
        except redis.exceptions.ConnectionError:
            pass

    async def get_quote_cache(self, symbol: str) -> Optional[StockQuote]:
        data = await self.get(f"quote:{symbol}")
        if data:
            return StockQuote.parse_raw(data)
        return None

    async def set_quote_cache(self, symbol: str, quote: StockQuote):
        await self.set(f"quote:{symbol}", quote.json(), ttl=10)

    async def get_kline_cache(self, symbol: str, period: str) -> Optional[List[KlineBar]]:
        data = await self.get(f"kline:{symbol}:{period}")
        if data:
            return [KlineBar(**item) for item in json.loads(data)]
        return None

    async def set_kline_cache(self, symbol: str, period: str, data: List[KlineBar]):
        json_data = json.dumps([bar.dict() for bar in data], default=str)
        await self.set(f"kline:{symbol}:{period}", json_data, ttl=3600)

cache_service = CacheService()
