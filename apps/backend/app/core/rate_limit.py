import time
from typing import Dict, Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.auth import verify_google_id_token

# 頻率階梯 (60 秒內允許的最大請求次數)
TIER_LIMITS = {
    "visitor": 30,        # 未登入訪客 (依 IP 限流)
    "authenticated": 120, # 已登入 Google 使用者 (依 Google sub 限流)
    "pro": 600,           # Pro 會員 / 高頻交易者
}

WINDOW_SECONDS = 60

# 記憶體存儲結構: key -> (count, reset_timestamp)
_rate_limit_store: Dict[str, Tuple[int, float]] = {}
_last_cleanup = time.time()


def _cleanup_stale(now: float):
    global _last_cleanup, _rate_limit_store
    if now - _last_cleanup < 180:  # 每 3 分鐘清理過期 Key
        return
    _last_cleanup = now
    _rate_limit_store = {
        k: (cnt, exp) for k, (cnt, exp) in _rate_limit_store.items() if exp > now
    }


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    client = request.client
    return client.host if client else "127.0.0.1"


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # 忽略健康檢查、文件與 WebSocket 端點
        if (
            path == "/health"
            or path.startswith("/docs")
            or path.startswith("/openapi")
            or path.startswith("/ws")
            or not path.startswith("/api/")
        ):
            return await call_next(request)

        now = time.time()
        _cleanup_stale(now)

        # 檢查是否有攜帶 Authorization Bearer Token (Google ID Token)
        auth_header = request.headers.get("authorization") or ""
        token = ""
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

        user = verify_google_id_token(token) if token else None

        if user:
            limit = TIER_LIMITS.get(user.role, TIER_LIMITS["authenticated"])
            key = f"usr_{user.sub}"
        else:
            limit = TIER_LIMITS["visitor"]
            ip = get_client_ip(request)
            key = f"ip_{ip}"

        record = _rate_limit_store.get(key)
        if not record or record[1] <= now:
            reset_at = now + WINDOW_SECONDS
            _rate_limit_store[key] = (1, reset_at)
            remaining = limit - 1
            reset_sec = int(reset_at)
        else:
            count, reset_at = record
            count += 1
            _rate_limit_store[key] = (count, reset_at)
            remaining = max(0, limit - count)
            reset_sec = int(reset_at)

            if count > limit:
                retry_after = max(1, int(reset_at - now))
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "rate_limit_exceeded",
                        "message": f"API 請求頻率超過上限（上限 {limit} 次/分鐘），請等待 {retry_after} 秒後重試。登入帳號可獲取更高額度。",
                        "retry_after": retry_after,
                    },
                    headers={
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_sec),
                        "Retry-After": str(retry_after),
                    },
                )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_sec)
        return response
