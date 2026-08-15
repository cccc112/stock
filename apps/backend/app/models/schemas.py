from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class MarketType(str, Enum):
    TW = "TW"
    US = "US"

class StockQuote(BaseModel):
    symbol: str
    name: str = ""
    price: float
    change: float
    change_pct: float
    volume: float
    high: float
    low: float
    open: float
    prev_close: float
    market: MarketType
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class KlineBar(BaseModel):
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

class OrderBookEntry(BaseModel):
    price: float
    volume: int

class OrderBook(BaseModel):
    bids: List[OrderBookEntry]
    asks: List[OrderBookEntry]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class WatchlistCreate(BaseModel):
    symbol: str
    market: MarketType = MarketType.TW

class WatchlistItem(WatchlistCreate):
    id: str
    created_at: datetime

class Watchlist(BaseModel):
    items: List[WatchlistItem]

class TransactionType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class PortfolioTransaction(BaseModel):
    id: str
    symbol: str
    type: TransactionType
    price: float
    shares: float
    timestamp: datetime
    market: MarketType

class PortfolioHolding(BaseModel):
    symbol: str
    shares: float
    avg_price: float
    current_price: float
    pnl: float
    pnl_pct: float
    market: MarketType

class PnLSummary(BaseModel):
    total_pnl_twd: float
    total_pnl_usd: float

class AlertCreate(BaseModel):
    symbol: str
    condition: str = "VOLUME_ANOMALY"

class Alert(AlertCreate):
    id: str
    is_active: bool
    created_at: datetime

class SimPortfolio(BaseModel):
    id: str
    name: str
    cash_balance: float
    is_ai_auto_trade: bool = False
    created_at: datetime

class SimTransaction(BaseModel):
    id: str
    portfolio_id: str
    symbol: str
    type: TransactionType
    price: float
    shares: float
    timestamp: datetime

class SimTradeRequest(BaseModel):
    symbol: str
    type: TransactionType
    price: float
    shares: float
    
class AIAnalysisRequest(BaseModel):
    symbol: Optional[str] = None
    period: str = "3mo"
    api_key: Optional[str] = None

class AIAnalysisResponse(BaseModel):
    symbol: str
    analysis: str
    generated_at: datetime

class VAPResult(BaseModel):
    price_range_start: float
    price_range_end: float
    volume: float
    is_peak: bool

class VolumeAnomalyType(str, Enum):
    HIGH_SELL_PRESSURE = "HIGH_SELL_PRESSURE"
    LOW_BUY_SUPPORT = "LOW_BUY_SUPPORT"
    NORMAL = "NORMAL"

class VolumeAnomalyResult(BaseModel):
    type: VolumeAnomalyType
    confidence: float
    details: Dict[str, Any]

class SupportResistanceType(str, Enum):
    SUPPORT = "SUPPORT"
    RESISTANCE = "RESISTANCE"

class SupportResistanceLevel(BaseModel):
    price: float
    type: SupportResistanceType
    strength: int

class QuantAnalysis(BaseModel):
    symbol: str
    vap: List[VAPResult]
    volume_anomaly: VolumeAnomalyResult
    support_resistance: List[SupportResistanceLevel]
    indicators: Dict[str, Any]
    strategies: Optional[List[Dict[str, Any]]] = None
