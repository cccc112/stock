import yfinance as yf
from typing import List, Dict, Optional
from datetime import datetime
from app.models.schemas import StockQuote, KlineBar, MarketType
import pandas as pd

class YahooFinanceService:
    
    def _format_symbol(self, symbol: str) -> str:
        # Don't modify index symbols (^TWII, ^GSPC, etc.)
        if symbol.startswith('^'):
            return symbol
        # Already has suffix
        if symbol.endswith('.TW') or symbol.endswith('.TWO'):
            return symbol
        # Pure number = TW listed stock
        if symbol.isnumeric():
            return f"{symbol}.TW"
        return symbol

    def get_history(self, symbol: str, period: str = "1mo", interval: str = "1d") -> List[KlineBar]:
        ticker = yf.Ticker(self._format_symbol(symbol))
        df = ticker.history(period=period, interval=interval)
        
        bars = []
        for index, row in df.iterrows():
            bars.append(KlineBar(
                time=index.to_pydatetime(),
                open=row['Open'],
                high=row['High'],
                low=row['Low'],
                close=row['Close'],
                volume=row['Volume']
            ))
        return bars

    def get_quote(self, symbol: str) -> Optional[StockQuote]:
        formatted_symbol = self._format_symbol(symbol)
        ticker = yf.Ticker(formatted_symbol)
        info = ticker.fast_info
        try:
            price = info.last_price
            prev_close = info.previous_close
            change = price - prev_close
            change_pct = (change / prev_close) * 100 if prev_close else 0
            
            market = MarketType.TW if formatted_symbol.endswith('.TW') or formatted_symbol.endswith('.TWO') else MarketType.US
            
            name = symbol
            
            return StockQuote(
                symbol=symbol,
                name=name,
                price=price,
                change=change,
                change_pct=change_pct,
                volume=info.last_volume,
                high=info.day_high,
                low=info.day_low,
                open=info.open,
                prev_close=prev_close,
                market=market
            )
        except Exception:
            return None

    def search(self, query: str) -> list:
        import requests
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=10&newsCount=0"
        headers = {"User-Agent": "Mozilla/5.0"}
        try:
            resp = requests.get(url, headers=headers, timeout=5)
            data = resp.json()
            results = []
            for q in data.get("quotes", []):
                symbol = q.get("symbol", "")
                name = q.get("shortname", q.get("longname", ""))
                market = "TW" if symbol.endswith(".TW") or symbol.endswith(".TWO") else "US"
                # Strip .TW/.TWO suffix for display
                display_symbol = symbol.replace(".TW", "").replace(".TWO", "")
                results.append({"symbol": display_symbol, "name": name, "market": market})
            return results
        except Exception:
            return []

yahoo_service = YahooFinanceService()
