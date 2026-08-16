from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json

from app.services.cache import cache_service
from app.api.v1 import stocks, watchlist, portfolio, quant, alerts, ai, simulator, market, institutions

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: scheduler disabled (requires real Supabase)
    # start_scheduler()
    yield
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
