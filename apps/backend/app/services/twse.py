import httpx
import json
from datetime import datetime
from typing import List, Optional
from app.models.schemas import StockQuote, OrderBook, OrderBookEntry, MarketType

class TWSEService:
    def __init__(self):
        self.base_url = "https://mis.twse.com.tw/stock/api"
        self.session = httpx.AsyncClient(timeout=8.0)

    def _safe_float(self, val: str, default: float = 0.0) -> float:
        """Parse TWSE price string safely (handles '-' for no data)."""
        if not val or val == '-':
            return default
        try:
            return float(val)
        except (ValueError, TypeError):
            return default

    async def fetch_realtime_quote(self, symbol: str) -> Optional[StockQuote]:
        clean_symbol = symbol.replace('.TW', '').replace('.TWO', '').replace('.tw', '')
        prefix = "otc" if symbol.endswith('.TWO') else "tse"
        url = f"{self.base_url}/getStockInfo.jsp?ex_ch={prefix}_{clean_symbol}.tw"
        try:
            response = await self.session.get(url)
            data = response.json()
            if not data.get("msgArray"):
                return None
            
            info = data["msgArray"][0]
            prev_close = self._safe_float(info.get("y", "0"))
            
            # z = current price during trading hours, "-" when closed
            z_val = info.get("z", "-")
            if z_val and z_val != "-":
                current_price = self._safe_float(z_val, prev_close)
            else:
                # Market closed: use prev_close as current price
                current_price = prev_close

            if current_price == 0:
                return None

            change = current_price - prev_close
            change_pct = (change / prev_close * 100) if prev_close else 0

            return StockQuote(
                symbol=symbol,
                name=info.get("n", symbol),
                price=current_price,
                change=change,
                change_pct=change_pct,
                volume=self._safe_float(info.get("v", "0")),
                high=self._safe_float(info.get("h", str(current_price)), current_price),
                low=self._safe_float(info.get("l", str(current_price)), current_price),
                open=self._safe_float(info.get("o", str(current_price)), current_price),
                prev_close=prev_close,
                market=MarketType.TW
            )
        except Exception as e:
            return None

    async def fetch_orderbook(self, symbol: str) -> Optional[OrderBook]:
        clean_symbol = symbol.replace('.TW', '').replace('.TWO', '').replace('.tw', '')
        prefix = "otc" if symbol.endswith('.TWO') else "tse"
        url = f"{self.base_url}/getStockInfo.jsp?ex_ch={prefix}_{clean_symbol}.tw"
        try:
            response = await self.session.get(url)
            data = response.json()
            if not data.get("msgArray"):
                return None
                
            info = data["msgArray"][0]
            bids = []
            asks = []
            
            b_prices = info.get("b", "").split("_")[:-1]
            b_vols = info.get("g", "").split("_")[:-1]
            a_prices = info.get("a", "").split("_")[:-1]
            a_vols = info.get("f", "").split("_")[:-1]
            
            for p, v in zip(b_prices, b_vols):
                if p and v and p != "-":
                    try:
                        bids.append(OrderBookEntry(price=float(p), volume=int(v)))
                    except (ValueError, TypeError):
                        pass
            
            for p, v in zip(a_prices, a_vols):
                if p and v and p != "-":
                    try:
                        asks.append(OrderBookEntry(price=float(p), volume=int(v)))
                    except (ValueError, TypeError):
                        pass
                    
            return OrderBook(bids=bids, asks=asks)
        except Exception:
            return None

    async def fetch_all_quotes(self) -> List[StockQuote]:
        return []

twse_service = TWSEService()
