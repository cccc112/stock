from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json

import psycopg
from fastapi.responses import JSONResponse

from app.services.cache import cache_service
from app.api.v1 import stocks, watchlist, portfolio, quant, alerts, ai, simulator, market, institutions, research

# Initialize application state
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

async def _init_database():
    """有設定 DATABASE_URL 時自動建表；失敗不影響行情等其他功能"""
    import logging
    from app.core.config import get_settings
    if not get_settings().database_url:
        logging.getLogger("db").warning("未設定 DATABASE_URL：自選股/投資組合/模擬交易/警報將無法使用")
        return
    try:
        from app.core.db import get_database
        await asyncio.to_thread(get_database().ensure_schema)
    except Exception as e:
        logging.getLogger("db").error("資料庫初始化失敗: %s", e)


async def _warm_caches():
    """背景預熱：推薦與產業排行計算較久，先算好放進快取，使用者第一次開頁面就是秒開"""
    import logging
    from app.services import screener
    log = logging.getLogger("warmup")
    from app.services.finmind import finmind_service
    await asyncio.sleep(5)
    while True:
        jobs = [("industries", lambda: screener.industry_overview(refresh=True))]  # 只用 Yahoo，不耗 FinMind 額度
        if finmind_service.has_token:
            # 推薦需要大量 FinMind 呼叫（籌碼/營收）；沒有 token 時額度很小，不主動預熱以免用光
            jobs += [
                ("recommend:tw", lambda: screener.recommend("tw", "balanced", None, 10, "curated", refresh=True)),
                ("recommend:hot", lambda: screener.recommend("tw", "balanced", None, 10, "hot", refresh=True)),
            ]
        for name, make in jobs:
            try:
                await make()
            except Exception as e:
                log.warning("warm %s failed: %s", name, e)
        await asyncio.sleep(15 * 60)  # 快取 TTL 為 15~20 分鐘，提前刷新


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: scheduler disabled (requires real Supabase)
    # start_scheduler()
    warm_task = asyncio.create_task(_warm_caches())
    await _init_database()
    yield
    warm_task.cancel()
    try:
        from app.core.db import _db
        if _db:
            _db.close()
    except Exception:
        pass
    # Shutdown
    if cache_service._redis:
        try:
            await cache_service._redis.close()
        except Exception:
            pass

app = FastAPI(title="AI Stock Monitor API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(psycopg.errors.UniqueViolation)
async def _unique_violation(_, exc):
    return JSONResponse(status_code=409, content={"detail": "資料已存在"})


@app.exception_handler(psycopg.errors.IntegrityError)
async def _integrity_error(_, exc):
    # 例如外鍵不存在、CHECK 約束不符(market 只能是 TW/US)
    return JSONResponse(status_code=400, content={"detail": "資料不符合資料庫限制，請檢查欄位內容"})


@app.exception_handler(psycopg.OperationalError)
async def _db_unavailable(_, exc):
    return JSONResponse(status_code=503, content={"detail": "資料庫暫時無法連線，請稍後再試"})


# Mount Routers
app.include_router(stocks.router, prefix="/api/v1/stocks", tags=["stocks"])
app.include_router(watchlist.router, prefix="/api/v1/watchlist", tags=["watchlist"])
app.include_router(portfolio.router, prefix="/api/v1/portfolio", tags=["portfolio"])
app.include_router(quant.router, prefix="/api/v1/quant", tags=["quant"])
app.include_router(alerts.router, prefix="/api/v1/alerts", tags=["alerts"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
app.include_router(simulator.router, prefix="/api/v1/simulator", tags=["simulator"])
app.include_router(market.router, prefix="/api/v1/market", tags=["market"])
app.include_router(institutions.router, prefix="/api/v1/institutions", tags=["Institutions"])
app.include_router(research.router, prefix="/api/v1/research", tags=["research"])

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    subscribed_symbols = []
    
    async def send_quotes():
        while True:
            if subscribed_symbols:
                quotes = []
                for sym in subscribed_symbols:
                    try:
                        from app.api.v1.stocks import get_quote
                        q = await get_quote(sym)
                        if q:
                            quotes.append(q.dict())
                    except Exception:
                        pass
                if quotes:
                    try:
                        await websocket.send_json({"type": "quotes", "data": quotes})
                    except Exception:
                        break
            await asyncio.sleep(10)
            
    task = asyncio.create_task(send_quotes())
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                symbols = json.loads(data)
                if isinstance(symbols, list):
                    subscribed_symbols = symbols
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    finally:
        task.cancel()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Stock Monitor API"}
