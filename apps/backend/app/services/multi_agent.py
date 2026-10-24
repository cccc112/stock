import asyncio
import json
import logging
from typing import Dict, Any, Optional
from google import genai
from app.core.config import get_settings
from app.services.finmind import finmind_service
from app.services import market_data
from app.services.fundamentals import build_financial_report
from app.api.v1.market import fetch_single_quote

logger = logging.getLogger(__name__)

class MultiAgentInvestmentCommittee:
    """
    多角色 AI 投資委員會 (Multi-Agent Investment Committee)
    基於 Stanford / MarketSenseAI 與 FinGPT 多視角辯論架構：
    1. Warren Buffett Agent (價值投資專家)
    2. Jim Simons Agent (量化動量專家)
    3. Chief Risk Officer Agent (首席風控長)
    4. Chief Investment Officer Agent (投資總監決策仲裁)
    """

    def __init__(self):
        settings = get_settings()
        self.default_client = genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None

    def _get_client(self, api_key: Optional[str] = None) -> genai.Client:
        client = genai.Client(api_key=api_key) if api_key else self.default_client
        if not client:
            raise ValueError("未提供 Gemini API Key。請在系統設定中輸入您的 API Key (BYOK) 以啟用 AI 投資委員會。")
        return client

    async def _collect_market_context(self, symbol: str) -> Dict[str, Any]:
        """蒐集行情、K線指標、基本面營收、籌碼與即時新聞"""
        clean_sym, kind, _ = market_data.split_symbol(symbol)
        is_tw = kind == "TW"

        # 1. 即時報價
        quote = await fetch_single_quote(symbol)

        # 2. 歷史價格（統一資料層，含備援）
        bars_summary = []
        try:
            bars = await market_data.get_history(symbol, "3mo", "1d")
            bars_summary = [{"date": str(b.time)[:10], "open": b.open, "high": b.high, "low": b.low,
                             "close": b.close, "volume": b.volume} for b in bars[-15:]]
        except Exception as e:
            logger.warning(f"Failed to fetch bars for {symbol}: {e}")

        # 財報重點（毛利率/EPS/估值…）
        financial_highlights = None
        try:
            rep = await build_financial_report(symbol)
            financial_highlights = {k: rep.get(k) for k in ("quarters", "valuation", "dividend", "scores") if rep.get(k)}
        except Exception as e:
            logger.warning(f"Failed to build financial report for {symbol}: {e}")

        # 3. 營收數據
        revenue_summary = []
        if is_tw:
            try:
                rev_data = await finmind_service.get_monthly_revenue(clean_sym, months=6)
                revenue_summary = rev_data[-4:] if rev_data else []
            except Exception:
                pass

        # 4. 法人籌碼
        inst_summary = []
        if is_tw:
            try:
                inst_data = await finmind_service.get_institutional_investors(clean_sym, days=10)
                if inst_data:
                    dates = sorted(list(set(r['date'] for r in inst_data)))[-5:]
                    for d in dates:
                        day_rows = [r for r in inst_data if r['date'] == d]
                        net_buy = sum(r.get('buy', 0) - r.get('sell', 0) for r in day_rows)
                        inst_summary.append({"date": d, "net_shares": net_buy})
            except Exception:
                pass

        # 5. 即時新聞
        news_titles = []
        if is_tw:
            try:
                news_data = await finmind_service.get_news(clean_sym, days=5)
                news_titles = [n.get('title') for n in news_data[:6] if n.get('title')]
            except Exception:
                pass

        return {
            "symbol": symbol,
            "current_price": quote.price if quote else 0,
            "change_pct": quote.change_pct if quote else 0,
            "volume": quote.volume if quote else 0,
            "recent_bars": bars_summary,
            "monthly_revenue": revenue_summary,
            "institutional_flow": inst_summary,
            "recent_news": news_titles,
            "financial_highlights": financial_highlights,
            "data_source": quote.source if quote else None,
            "data_is_stale": quote.stale if quote else True,
        }

    async def _call_agent_json(self, api_key: Optional[str], prompt: str) -> Dict[str, Any]:
        """向 Gemini 發出請求並安全解析 JSON（含模型備援）"""
        from app.services.gemini import gemini_service
        try:
            return await gemini_service.generate_json(prompt, api_key)
        except Exception as e:
            logger.error(f"Agent JSON generation failed: {e}")
            return {"error": str(e)}

    async def run_committee(self, symbol: str, api_key: Optional[str] = None) -> Dict[str, Any]:
        """啟動 AI 投資委員會進行多角色分析與裁決"""
        client = self._get_client(api_key)
        context = await self._collect_market_context(symbol)

        context_str = json.dumps(context, ensure_ascii=False, default=str)

        # 角色 1: Warren Buffett 價值投資專家
        buffett_prompt = f"""
        你現在是巴菲特 (Warren Buffett) 視角的價值投資分析師。
        請根據以下標的真實資料：{context_str}
        專注於商業護城河、營收年增率、毛利趨勢、長期內在價值與安全邊際。
        請輸出以下 JSON 格式：
        {{
            "agent": "Warren Buffett",
            "role": "價值投資首席顧問",
            "stance": "BULLISH" 或 "BEARISH" 或 "NEUTRAL",
            "score": 0到100的數值,
            "moat_rating": "WIDE" 或 "NARROW" 或 "NONE",
            "summary": "繁體中文簡明評語 (80字以內)",
            "key_strengths": ["核心優勢1", "核心優勢2"],
            "major_risks": ["價值層面隱憂1"]
        }}
        """

        # 角色 2: Jim Simons 量化動量專家
        simons_prompt = f"""
        你現在是文藝復興科技 Jim Simons 視角的量化動量與技術指標分析專家。
        請根據以下標的真實資料：{context_str}
        專注於 K線趨勢、支撐與壓力位、均線動能、成交量變化與外資投信籌碼流向。
        請輸出以下 JSON 格式：
        {{
            "agent": "Jim Simons",
            "role": "量化動量分析師",
            "stance": "BULLISH" 或 "BEARISH" 或 "NEUTRAL",
            "score": 0到100的數值,
            "trend_strength": "STRONG" 或 "MODERATE" 或 "WEAK",
            "support_level": 預估支撐價格數值,
            "resistance_level": 預估壓力價格數值,
            "summary": "繁體中文簡明評語 (80字以內)",
            "momentum_signals": ["技術訊號1", "籌碼訊號2"]
        }}
        """

        # 角色 3: Chief Risk Officer 首席風控審查官
        cro_prompt = f"""
        你現在是避險基金的首席風控長 (Chief Risk Officer, CRO)。
        你的職責不是吹捧股票，而是「無情地挑毛病、找出潛在黑天鵝與崩跌風險」。
        請根據以下標的真實資料：{context_str}
        評估下行最大回撤 (MDD)、估值溢價泡沫、大盤回檔脆弱度與籌碼鬆動風險。
        請輸出以下 JSON 格式：
        {{
            "agent": "Chief Risk Officer",
            "role": "首席風控長",
            "risk_level": "LOW" 或 "MEDIUM" 或 "HIGH" 或 "CRITICAL",
            "score": 0到100的風控安全分 (越低代表風險越高),
            "summary": "繁體中文風險警示 (80字以內)",
            "top_vulnerabilities": ["致命弱點1", "潛在爆雷點2"],
            "recommended_stop_loss_pct": 建議嚴格停損趴數數值 (例如 6.5)
        }}
        """

        # 並行執行三位專家的獨立審查
        buffett_task = self._call_agent_json(api_key, buffett_prompt)
        simons_task = self._call_agent_json(api_key, simons_prompt)
        cro_task = self._call_agent_json(api_key, cro_prompt)

        buffett_res, simons_res, cro_res = await asyncio.gather(
            buffett_task, simons_task, cro_task
        )

        # 角色 4: Chief Investment Officer (CIO 投資總監決策仲裁)
        experts_verdict_str = json.dumps({
            "buffett": buffett_res,
            "simons": simons_res,
            "risk_officer": cro_res
        }, ensure_ascii=False, default=str)

        cio_prompt = f"""
        你現在是避險基金投資委員會總監 (Chief Investment Officer, CIO)。
        三位頂級專家的獨立意見如下：
        {experts_verdict_str}
        
        標的即時數據：
        現價: {context['current_price']}, 漲跌: {context['change_pct']}%, 最近新聞: {context['recent_news']}
        
        請召開決策仲裁會議，綜合考量價值、動量與風控審查，作出最終投資裁決。
        請輸出以下 JSON 格式：
        {{
            "final_action": "STRONG_BUY" 或 "BUY" 或 "HOLD" 或 "SELL" 或 "STRONG_SELL",
            "action_label": "強力買進" 或 "分批佈局" 或 "區間觀望" 或 "逢高獲利" 或 "嚴格停損",
            "overall_ai_score": 0到100的綜合評分,
            "suggested_position_pct": 建議資金配置比例數值 (0 到 100),
            "entry_zone": "建議買進區間字串 (例如 1050 - 1080)",
            "target_price": 建議目標價位數值,
            "stop_loss_price": 嚴格停損價位數值,
            "executive_summary": "繁體中文投資委員會總結陳述 (150字以內，直指核心決策邏輯)",
            "action_plan": [
                "具體執行步驟1",
                "具體執行步驟2",
                "風控應變指引3"
            ]
        }}
        """

        cio_res = await self._call_agent_json(api_key, cio_prompt)

        return {
            "symbol": symbol,
            "market_snapshot": {
                "price": context["current_price"],
                "change_pct": context["change_pct"],
                "volume": context["volume"]
            },
            "cio_verdict": cio_res,
            "experts": {
                "buffett": buffett_res,
                "simons": simons_res,
                "cro": cro_res
            }
        }

multi_agent_service = MultiAgentInvestmentCommittee()
