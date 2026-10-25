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
        """啟動 AI 投資委員會進行多角色分析與裁決（單次極速 JSON 合成 + 財報量化自動備援）"""
        context = await self._collect_market_context(symbol)
        context_str = json.dumps(context, ensure_ascii=False, default=str)

        combined_prompt = f"""
        你現在是避險基金的「多角色 AI 投資委員會」，請根據以下 {symbol} 的真實市場、財報、籌碼與新聞資料：
        {context_str}

        請同時模擬三位專家與最終投資總監 (CIO) 的立體審查，並以單一 JSON 物件輸出：
        {{
          "cio_verdict": {{
            "final_action": "STRONG_BUY 或 BUY 或 HOLD 或 SELL",
            "action_label": "強力買進 或 分批佈局 或 區間觀望 或 逢高減碼",
            "overall_ai_score": 0到100的數值,
            "suggested_position_pct": 0到100的建議部位百分比,
            "entry_zone": "建議買進區間字串",
            "target_price": 建議目標價數值,
            "stop_loss_price": 嚴格停損價數值,
            "executive_summary": "繁體中文投資總監決策總結 (120字以內)",
            "action_plan": ["執行步驟1", "執行步驟2", "風控指引3"]
          }},
          "experts": {{
            "buffett": {{
              "agent": "Warren Buffett",
              "role": "價值投資首席顧問",
              "stance": "BULLISH 或 NEUTRAL 或 BEARISH",
              "score": 0到100的數值,
              "moat_rating": "WIDE 或 NARROW",
              "summary": "繁體中文價值面評語 (80字內)",
              "key_strengths": ["核心優勢1", "核心優勢2"],
              "major_risks": ["價值隱憂1"]
            }},
            "simons": {{
              "agent": "Jim Simons",
              "role": "量化動量分析師",
              "stance": "BULLISH 或 NEUTRAL 或 BEARISH",
              "score": 0到100的數值,
              "trend_strength": "STRONG 或 MODERATE 或 WEAK",
              "support_level": 支撐價數值,
              "resistance_level": 壓力價數值,
              "summary": "繁體中文量價籌碼評語 (80字內)",
              "momentum_signals": ["技術訊號1", "籌碼訊號2"]
            }},
            "cro": {{
              "agent": "Chief Risk Officer",
              "role": "首席風控長",
              "risk_level": "LOW 或 MEDIUM 或 HIGH",
              "score": 0到100的安全分,
              "summary": "繁體中文風險審查警示 (80字內)",
              "top_vulnerabilities": ["潛在弱點1", "潛在風險2"],
              "recommended_stop_loss_pct": 建議停損百分比數值
            }}
          }}
        }}
        """

        res = await self._call_agent_json(api_key, combined_prompt)
        if res and "cio_verdict" in res and "experts" in res:
            return {
                "symbol": symbol,
                "market_snapshot": {
                    "price": context["current_price"],
                    "change_pct": context["change_pct"],
                    "volume": context["volume"],
                },
                "cio_verdict": res["cio_verdict"],
                "experts": res["experts"],
            }

        # 若 Gemini 逾時或未設定 Key，使用真實財報與四大交易模型合成委員會裁決
        from app.services.strategy_models import build_deep_research_report
        rep = await build_deep_research_report(symbol)
        v = rep.get("verdict") or {}
        dup = (rep.get("financials") or {}).get("dupont") or {}
        val = (rep.get("financials") or {}).get("valuation") or {}
        bal = (rep.get("financials") or {}).get("balance") or {}
        models = rep.get("models") or {}
        pio = models.get("piotroski") or {}
        can = models.get("canslim") or {}
        min_m = models.get("minervini") or {}
        smc = models.get("smc") or {}
        ez = v.get("entry_zone") or [context["current_price"] * 0.97, context["current_price"]]
        score = v.get("total_score") or 65
        action = "STRONG_BUY" if score >= 75 else "BUY" if score >= 60 else "HOLD" if score >= 46 else "SELL"
        label = "強力買進" if action == "STRONG_BUY" else "分批佈局" if action == "BUY" else "區間觀望" if action == "HOLD" else "逢高減碼"

        return {
            "symbol": symbol,
            "market_snapshot": {
                "price": context["current_price"] or rep.get("price") or 0,
                "change_pct": context["change_pct"] or rep.get("change_pct") or 0,
                "volume": context["volume"],
            },
            "cio_verdict": {
                "final_action": action,
                "action_label": label,
                "overall_ai_score": score,
                "suggested_position_pct": 65 if score >= 72 else 45 if score >= 58 else 25,
                "entry_zone": f"{ez[0]} ~ {ez[-1]}",
                "target_price": v.get("target_price"),
                "stop_loss_price": v.get("stop_loss"),
                "executive_summary": v.get("conclusion") or f"{symbol} 綜合財報與量化評分為 {score}/100（{label}）。",
                "action_plan": [
                    f"於支撐區 {ez[0]} ~ {ez[-1]} 分批進場佈局，避免追高。",
                    f"波段目標價看至 {v.get('target_price')}，風報比約 1:{v.get('risk_reward', 2.0)}。",
                    f"若收盤跌破防守停損位 {v.get('stop_loss')} 則嚴格執行停損。",
                ],
            },
            "experts": {
                "buffett": {
                    "agent": "Warren Buffett",
                    "role": "價值投資首席顧問",
                    "stance": "BULLISH" if (pio.get("score") or 5) >= 6 else "NEUTRAL",
                    "score": int((pio.get("score") or 6) / 9 * 100),
                    "moat_rating": "WIDE" if (dup.get("roe_ttm") or 12) >= 16 else "NARROW",
                    "summary": f"Piotroski 財報排雷通過 {pio.get('score', 6)}/9 項，近四季 ROE {dup.get('roe_ttm') or '—'}%，本益比 {val.get('per') or '—'}x。",
                    "key_strengths": [
                        f"Piotroski F-Score {pio.get('score', 6)}/9（{pio.get('status', '')}）",
                        f"杜邦 ROE {dup.get('roe_ttm') or '—'}% · 殖利率 {val.get('dividend_yield') or '—'}%",
                    ],
                    "major_risks": [f"留意負債比 {bal.get('debt_ratio') or '—'}% 與產業景氣波動"],
                },
                "simons": {
                    "agent": "Jim Simons",
                    "role": "量化動量分析師",
                    "stance": "BULLISH" if (min_m.get("score") or 4) >= 5 else "NEUTRAL",
                    "score": int((min_m.get("score") or 5) / max(1, min_m.get("max_score") or 7) * 100),
                    "trend_strength": "STRONG" if (min_m.get("score") or 4) >= 5 else "MODERATE",
                    "support_level": ez[0],
                    "resistance_level": v.get("target_price"),
                    "summary": f"Minervini 趨勢模板通過 {min_m.get('score', 5)}/{min_m.get('max_score', 7)} 項，CANSLIM 成長檢核 {can.get('score', 4)}/7 項。",
                    "momentum_signals": [
                        f"Minervini Stage 2 檢核 {min_m.get('score', 5)}/{min_m.get('max_score', 7)}",
                        f"SMC 聰明錢結構 {smc.get('score', 3)}/5（{smc.get('status', '')}）",
                    ],
                },
                "cro": {
                    "agent": "Chief Risk Officer",
                    "role": "首席風控長",
                    "risk_level": "HIGH" if (bal.get("debt_ratio") or 40) > 60 else "MEDIUM" if (bal.get("debt_ratio") or 40) > 45 else "LOW",
                    "score": int(max(45, min(92, 100 - (bal.get("debt_ratio") or 40) * 0.7))),
                    "summary": f"負債比率 {bal.get('debt_ratio') or '—'}%，流動比率 {bal.get('current_ratio') or '—'}x，跌破 {v.get('stop_loss')} 須嚴格停損。",
                    "top_vulnerabilities": (v.get("bear_points") or ["留意上檔壓力區獲利了結賣壓"])[:2],
                    "recommended_stop_loss_pct": 6.0,
                },
            },
        }

multi_agent_service = MultiAgentInvestmentCommittee()
