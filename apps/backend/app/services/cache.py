import json
import time
from typing import Optional, List, Dict, Tuple, Any
from app.models.schemas import StockQuote, KlineBar

class CacheService:
    """
    Simple in-memory cache with TTL.
    Redis is optional - if unavailable, falls back to memory cache.
    """
    def __init__(self):
        self._store: Dict[str, Tuple[Any, float]] = {}  # key -> (value, expires_at)
        self._redis = None
        self._try_redis()

    def _try_redis(self):
        try:
            from app.core.config import get_settings
            import redis.asyncio as redis_asyncio
            settings = get_settings()
            self._redis = redis_asyncio.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
        except Exception:
            self._redis = None

    def _mem_get(self, key: str) -> Optional[str]:
        if key in self._store:
            val, exp = self._store[key]
            if exp > time.time():
                return val
            else:
                del self._store[key]
        return None

    def _mem_set(self, key: str, value: str, ttl: int):
        self._store[key] = (value, time.time() + ttl)

    def _mem_delete(self, key: str):
        self._store.pop(key, None)

    async def get(self, key: str) -> Optional[str]:
        if self._redis:
            try:
                result = await self._redis.get(key)
                return result
            except Exception:
                # Redis failed, fall through to memory
                pass
        return self._mem_get(key)

    async def set(self, key: str, value: str, ttl: int):
        if self._redis:
            try:
                await self._redis.set(key, value, ex=ttl)
                return
            except Exception:
                pass
        self._mem_set(key, value, ttl)

    async def delete(self, key: str):
        if self._redis:
            try:
                await self._redis.delete(key)
                return
            except Exception:
                pass
        self._mem_delete(key)

    async def get_quote_cache(self, symbol: str) -> Optional[StockQuote]:
        data = await self.get(f"quote:{symbol}")
        if data:
            try:
                return StockQuote.model_validate_json(data)
            except Exception:
                try:
                    return StockQuote.parse_raw(data)
                except Exception:
                    return None
        return None

    async def set_quote_cache(self, symbol: str, quote: StockQuote):
        try:
            await self.set(f"quote:{symbol}", quote.model_dump_json(), ttl=15)
        except Exception:
            await self.set(f"quote:{symbol}", quote.json(), ttl=15)

    async def get_kline_cache(self, symbol: str, period: str) -> Optional[List[KlineBar]]:
        data = await self.get(f"kline:{symbol}:{period}")
        if data:
            try:
                return [KlineBar(**item) for item in json.loads(data)]
            except Exception:
                return None
        return None

    async def set_kline_cache(self, symbol: str, period: str, data: List[KlineBar]):
        try:
            json_data = json.dumps([bar.model_dump() for bar in data], default=str)
        except Exception:
            json_data = json.dumps([bar.dict() for bar in data], default=str)
        await self.set(f"kline:{symbol}:{period}", json_data, ttl=3600)

cache_service = CacheService()
