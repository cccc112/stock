from app.services.gemini import gemini_service
from app.quant.strategies import run_all_strategies
from app.quant.indicators import calculate_ma, calculate_rsi, calculate_macd
import json
import pandas as pd

class AITrader:
    async def generate_suggestions(self, symbols: list, api_key: str = None) -> list:
        """For each symbol, analyze and generate BUY/SELL/HOLD suggestion"""
        suggestions = []
        for symbol in symbols:
            try:
                # Get quote data
                from app.services.yahoo import yahoo_service
                quote = yahoo_service.get_quote(symbol)
                history_data = yahoo_service.get_history(symbol, period='3mo')
                
                if not history_data:
                    continue
                    
                history = pd.DataFrame([b.dict() if hasattr(b, 'dict') else b for b in history_data])
                
                if history is None or history.empty:
                    continue
                
                # Run strategies
                signals = run_all_strategies(history)
                
                # Calculate key indicators
                rsi = calculate_rsi(history)
                
                # Use AI to synthesize
                decision = await gemini_service.auto_trade_decision(symbol, {
                    "price": float(quote.price) if quote else 0,
                    "signals": signals,
                    "rsi": float(rsi) if rsi is not None else None,
                }, api_key=api_key)
                
                suggestions.append({
                    "symbol": symbol,
                    "action": decision.strip().upper(),
                    "signals": signals,
                    "price": float(quote.price) if quote else 0,
                })
            except Exception as e:
                print(f"Error generating suggestion for {symbol}: {e}")
                continue
        return suggestions

ai_trader = AITrader()
