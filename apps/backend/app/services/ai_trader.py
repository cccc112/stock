from app.services.gemini import gemini_service
from app.quant.strategies import run_all_strategies
from app.quant.indicators import calculate_ma, calculate_rsi, calculate_macd
import json
import pandas as pd

class AITrader:
    async def _analyze_single(self, symbol: str, api_key: str = None):
        try:
            from app.services.yahoo import yahoo_service
            import asyncio
            loop = asyncio.get_event_loop()
            
            quote = None
            try:
                quote = await asyncio.wait_for(
                    loop.run_in_executor(None, yahoo_service.get_quote, symbol),
                    timeout=4.0
                )
            except Exception:
                pass
                
            history_data = None
            try:
                history_data = await asyncio.wait_for(
                    loop.run_in_executor(None, yahoo_service.get_history, symbol, '3mo', '1d'),
                    timeout=4.0
                )
            except Exception:
                pass
            
            if not history_data:
                if symbol.endswith('.TW') or symbol.isnumeric():
                    from app.services.finmind import finmind_service
                    clean_sym = symbol.replace('.TW', '')
                    fm_data = await finmind_service.get_history(clean_sym, days=90)
                    if fm_data:
                        history_data = []
                        for row in fm_data:
                            history_data.append({
                                "time": pd.to_datetime(row["date"]),
                                "open": row.get("open", 0),
                                "high": row.get("max", 0),
                                "low": row.get("min", 0),
                                "close": row.get("close", 0),
                                "volume": row.get("Trading_Volume", 0)
                            })
                
            if not history_data:
                return None
                
            history = pd.DataFrame([b.dict() if hasattr(b, 'dict') else b for b in history_data])
            
            if history is None or history.empty:
                return None
            
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
            
            return {
                "symbol": symbol,
                "action": decision.strip().upper(),
                "signals": signals,
                "price": float(quote.price) if quote else 0,
            }
        except Exception as e:
            print(f"Error generating suggestion for {symbol}: {e}")
            return None

    async def generate_suggestions(self, symbols: list, api_key: str = None) -> list:
        """For each symbol, analyze and generate BUY/SELL/HOLD suggestion concurrently"""
        import asyncio
        tasks = [self._analyze_single(symbol, api_key) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        suggestions = []
        for r in results:
            if isinstance(r, dict):
                suggestions.append(r)
                
        return suggestions

ai_trader = AITrader()
