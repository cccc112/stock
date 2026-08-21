import httpx
import json
import asyncio
from datetime import datetime
from typing import List, Optional
from app.models.schemas import StockQuote, OrderBook, OrderBookEntry, MarketType

class TWSEService:
    def __init__(self):
        self.base_url = "https://mis.twse.com.tw/stock/api"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.9,zh-TW;q=0.8,zh;q=0.7",
        }
        self.session = httpx.AsyncClient(timeout=8.0, headers=headers)

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
        symbols = ["2330.TW", "2317.TW", "2454.TW", "2308.TW", "2881.TW", "2882.TW", "2891.TW", "2002.TW", "1216.TW", "1301.TW"]
        tasks = [self.fetch_realtime_quote(sym) for sym in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        quotes = [res for res in results if isinstance(res, StockQuote)]
        return quotes

twse_service = TWSEService()
