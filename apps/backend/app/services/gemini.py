import asyncio
import json
import logging
import time
from typing import Optional

from google import genai
from google.genai import types

from app.core.config import get_settings

logger = logging.getLogger(__name__)

NO_KEY_MSG = "未提供 Gemini API Key。請在系統設定中輸入您的 API Key (BYOK) 或於後端 .env 設定 GEMINI_API_KEY 以啟用 AI 功能。"

SYSTEM_RULES = (
    "你是專業的台美股研究分析師。只能根據提供的資料作答，資料中沒有的數字不要編造；"
    "資料不足就明說「資料不足」。所有輸出使用繁體中文，結論要具體、可執行，"
    "並在結尾加上一行風險提示：以上內容僅供研究參考，非投資建議。"
)


class GeminiService:
    def __init__(self):
        settings = get_settings()
        self.client = self._make_client(settings.gemini_api_key) if settings.gemini_api_key else None
        # 設定的模型 -> Google 建議的新版 -> 會自動更新的別名；舊模型名稱會被下架(404)而自動跳過
        self.models = [m for m in dict.fromkeys([settings.gemini_model, "gemini-3.8-flash", "gemini-flash-latest"]) if m]
        self._dead: set = set()   # 已確認下架的模型，之後不再嘗試
        self.retry_delay = 2.0    # 遇到暫時性錯誤(過載/限流)時的重試間隔(秒)
        self.total_budget = 95.0  # 單一請求最多花多久；超過就放棄，避免卡過代理(Render)逾時

    @staticmethod
    def _make_client(api_key: str) -> genai.Client:
        # 單次呼叫逾時 40 秒（SDK 預設可能等非常久）
        return genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=40_000))

    def _client(self, api_key: Optional[str]) -> genai.Client:
        client = self._make_client(api_key) if api_key else self.client
        if not client:
            raise ValueError(NO_KEY_MSG)
        return client

    async def generate(self, prompt: str, api_key: Optional[str] = None, as_json: bool = False,
                       model: Optional[str] = None) -> str:
        """非阻塞呼叫 Gemini：模型備援 + 暫時性錯誤(503/429/逾時)短暫重試 + 總時間上限"""
        client = self._client(api_key)
        config = {"response_mime_type": "application/json"} if as_json else None
        deadline = time.monotonic() + self.total_budget
        candidates = [m for m in ([model] if model else []) + self.models if m not in self._dead] or self.models
        last_err: Optional[Exception] = None
        fatal = False
        for m in candidates:
            for attempt in range(2):
                if time.monotonic() > deadline:
                    break
                try:
                    resp = await asyncio.to_thread(
                        client.models.generate_content, model=m, contents=prompt, config=config)
                    if resp.text:
                        return resp.text
                    break
                except Exception as e:
                    last_err, msg = e, str(e)
                    logger.warning("Gemini model %s failed (attempt %d): %s", m, attempt + 1, msg[:200])
                    if "API key" in msg or "PERMISSION_DENIED" in msg or "UNAUTHENTICATED" in msg:
                        fatal = True  # 金鑰錯誤換模型也沒用
                        break
                    if "NOT_FOUND" in msg or "no longer available" in msg:
                        self._dead.add(m)
                        break
                    transient = any(k in msg for k in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED",
                                                       "overloaded", "high demand", "timed out", "Timeout"))
                    if transient and attempt == 0:
                        await asyncio.sleep(self.retry_delay)
                        continue
                    break
            if fatal or time.monotonic() > deadline:
                break
        raise RuntimeError(f"Gemini 呼叫失敗: {last_err}")

    async def generate_json(self, prompt: str, api_key: Optional[str] = None) -> dict:
        text = await self.generate(prompt, api_key, as_json=True)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start, end = text.find("{"), text.rfind("}")
            return json.loads(text[start:end + 1])

    # ------------------------------------------------------------ 既有功能
    async def analyze_stock(self, symbol: str, kline_data: list, indicators: dict, vap: list, api_key: str = None) -> str:
        prompt = f"""{SYSTEM_RULES}
分析標的: {symbol}
近期K線: {json.dumps(kline_data, default=str)}
技術指標: {json.dumps(indicators, default=str)}
籌碼密集區(VAP): {json.dumps(vap, default=str)}

請用 markdown 條列：趨勢判斷、支撐/壓力、操作建議(進場/停損/目標)。"""
        return await self.generate(prompt, api_key)

    async def market_summary(self, api_key: str = None, context: Optional[dict] = None) -> str:
        prompt = f"""{SYSTEM_RULES}
以下是今日實際市場數據(JSON)，請據此撰寫台美股盤勢診斷，不得引用資料以外的指數點位或新聞：
{json.dumps(context or {}, ensure_ascii=False, default=str)}
請包含：大盤強弱、資金流向、需留意的風險、明日觀察重點。"""
        return await self.generate(prompt, api_key)

    async def review_trades(self, transactions: list, portfolio: dict, api_key: str = None) -> str:
        prompt = f"""{SYSTEM_RULES}
你是交易教練，請檢討以下模擬交易：
Portfolio: {json.dumps(portfolio, default=str)}
Transactions: {json.dumps(transactions, default=str)}
分析進出場時機、部位大小、風險控管，並給出 3 點具體改進建議。"""
        return await self.generate(prompt, api_key)

    async def auto_trade_decision(self, symbol: str, quote_data: dict, api_key: str = None) -> str:
        prompt = f"""你是量化交易機器人。依資料對 {symbol} 做出決策。
資料: {json.dumps(quote_data, default=str)}
只回答一個單字: BUY、SELL 或 HOLD。"""
        text = (await self.generate(prompt, api_key)).strip().upper()
        for w in ("BUY", "SELL", "HOLD"):
            if w in text:
                return w
        return "HOLD"

    async def chart_fundamental_analysis(self, symbol: str, supports: list, resistances: list, fundamentals: dict, api_key: str = None) -> str:
        prompt = f"""{SYSTEM_RULES}
標的: {symbol}
計算出的支撐線: {supports}
計算出的壓力線: {resistances}
基本面資料: {json.dumps(fundamentals, default=str, ensure_ascii=False)}
說明基本面如何支持（或不支持）這些技術位置，並給出具體操作計畫，簡潔但有洞見。"""
        return await self.generate(prompt, api_key)

    # ------------------------------------------------------------ 新功能
    async def financial_report_advice(self, symbol: str, report: dict, api_key: str = None) -> str:
        prompt = f"""{SYSTEM_RULES}
以下是 {symbol} 已計算好的財報指標(季度由新到舊、營收、獲利率、成長率、估值、股利)：
{json.dumps(report, ensure_ascii=False, default=str)}

請以 markdown 輸出財報診斷與建議：
## 一句話結論
## 獲利能力（毛利率/營益率/淨利率的趨勢與原因）
## 成長性（營收與EPS的YoY/QoQ）
## 財務體質（負債比、流動比、現金流，若資料有）
## 估值（本益比、股價淨值比、殖利率 vs 自身歷史區間）
## 風險與觀察指標
## 操作建議（偏多/中立/偏空，並說明適合的投資週期）"""
        return await self.generate(prompt, api_key)

    async def industry_report(self, industry: str, data: dict, api_key: str = None) -> str:
        prompt = f"""{SYSTEM_RULES}
產業: {industry}
以下是此產業代表個股的實際漲跌、法人買賣超、營收成長數據：
{json.dumps(data, ensure_ascii=False, default=str)}

請撰寫產業研究報告(markdown)：
## 產業現況與景氣位置
## 關鍵驅動因素與供應鏈（上中下游）
## 資金面（法人動向、強弱股）
## 龍頭與潛力股比較（只使用資料中的個股）
## 風險因子
## 投資策略建議"""
        return await self.generate(prompt, api_key)

    async def recommendation_rationale(self, picks: list, api_key: str = None) -> str:
        prompt = f"""{SYSTEM_RULES}
以下是量化評分系統篩出的推薦清單（含技術、籌碼、營收、估值分項分數與訊號）：
{json.dumps(picks, ensure_ascii=False, default=str)}

針對每檔寫 2~3 句推薦理由（引用分項數據）、進場參考區間與停損位置，最後整體提醒風險。使用 markdown。"""
        return await self.generate(prompt, api_key)


gemini_service = GeminiService()
