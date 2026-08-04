from google import genai
from app.core.config import get_settings
import json

class GeminiService:
    def __init__(self):
        settings = get_settings()
        self.client = genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None
        
    async def analyze_stock(self, symbol: str, kline_data: list, indicators: dict, vap: list, api_key: str = None) -> str:
        client = genai.Client(api_key=api_key) if api_key else self.client
        
        prompt = f"""You are a professional stock analyst. Analyze {symbol}.
        Market Data: {len(kline_data)} recent bars.
        Indicators: {json.dumps(indicators, default=str)}
        VAP Zones: {json.dumps(vap, default=str)}
        
        Provide a structured markdown analysis in 繁體中文 discussing trend, support/resistance, and actionable insights.
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
        
    async def market_summary(self, api_key: str = None) -> str:
        client = genai.Client(api_key=api_key) if api_key else self.client
        
        prompt = "Analyze overall TW/US market conditions today. Provide a structured markdown analysis in 繁體中文."
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text
        
    async def review_trades(self, transactions: list, portfolio: dict, api_key: str = None) -> str:
        client = genai.Client(api_key=api_key) if api_key else self.client
        
        prompt = f"""You are a trading coach. Review these trades:
        Portfolio: {json.dumps(portfolio, default=str)}
        Transactions: {json.dumps(transactions, default=str)}
        
        Analyze entry/exit timing, position sizing, risk management. Provide structured markdown in 繁體中文.
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text

    async def auto_trade_decision(self, symbol: str, quote_data: dict, api_key: str = None) -> str:
        client = genai.Client(api_key=api_key) if api_key else self.client
        
        prompt = f"""You are an AI trading bot. Make a BUY, SELL, or HOLD decision for {symbol}.
        Current Quote Data: {json.dumps(quote_data, default=str)}
        
        Respond with ONLY one word: BUY, SELL, or HOLD.
        """
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
        )
        return response.text

gemini_service = GeminiService()
