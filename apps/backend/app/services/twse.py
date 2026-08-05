import httpx
import json
from datetime import datetime
from typing import List, Optional
from app.models.schemas import StockQuote, OrderBook, OrderBookEntry, MarketType

class TWSEService:
    def __init__(self):
        self.base_url = "https://mis.twse.com.tw/stock/api"
        self.session = httpx.AsyncClient()

    async def fetch_realtime_quote(self, symbol: str) -> Optional[StockQuote]:
        # TWSE MIS requires a session cookie, so we hit the index first if needed, 
        # or we can just make the request and usually it works with a single request.
        clean_symbol = symbol.replace('.TW', '').replace('.TWO', '')
        prefix = "otc" if symbol.endswith('.TWO') else "tse"
        url = f"{self.base_url}/getStockInfo.jsp?ex_ch={prefix}_{clean_symbol}.tw"
        try:
            response = await self.session.get(url)
            data = response.json()
            if not data.get("msgArray"):
                return None
            
            info = data["msgArray"][0]
            current_price = float(info.get("z", info.get("y", 0)))
            prev_close = float(info.get("y", 0))
            change = current_price - prev_close
            change_pct = (change / prev_close) * 100 if prev_close else 0
            
            return StockQuote(
                symbol=symbol,
                name=info.get("n", ""),
                price=current_price,
                change=change,
                change_pct=change_pct,
                volume=float(info.get("v", 0)),
                high=float(info.get("h", current_price)),
                low=float(info.get("l", current_price)),
                open=float(info.get("o", current_price)),
                prev_close=prev_close,
                market=MarketType.TW
            )
        except Exception:
            return None

    async def fetch_orderbook(self, symbol: str) -> Optional[OrderBook]:
        clean_symbol = symbol.replace('.TW', '').replace('.TWO', '')
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
            b_vols = info.get("g", "").split("_")[:-1] # g is actually bid volume in some mappings, let's use f and g carefully
            # Usually: b=bid prices, g=bid volumes, a=ask prices, f=ask volumes
            # Let's map it based on TWSE MIS standard: b=bid price, g=bid vol, a=ask price, f=ask vol
            
            a_prices = info.get("a", "").split("_")[:-1]
            a_vols = info.get("f", "").split("_")[:-1]
            
            for p, v in zip(b_prices, b_vols):
                if p and v:
                    bids.append(OrderBookEntry(price=float(p), volume=int(v)))
            
            for p, v in zip(a_prices, a_vols):
                if p and v:
                    asks.append(OrderBookEntry(price=float(p), volume=int(v)))
                    
            return OrderBook(bids=bids, asks=asks)
        except Exception:
            return None

    async def fetch_all_quotes(self) -> List[StockQuote]:
        # Dummy implementation for index stocks
        return []

twse_service = TWSEService()
