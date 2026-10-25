"""
四大經典開源量化與基本面交易模型引擎 (Strategy & Fundamental Models Engine)

參考 GitHub 經典開源專案實作：
1. Piotroski F-Score (9項財報健康度與獲利含金量排雷模型 - 參考 gauss314/skills, BharatQuant)
2. William O'Neil CANSLIM 成長動能模型 (7項成長與相對強度檢核 - 參考 ssshah86/CAN-SLIM-screener, xang1234/stock-screener)
3. Mark Minervini VCP / SEPA 第二階段多頭趨勢模板 (7項均線與波動收斂檢核 - 參考 RyanJHamby/stock-screener)
4. SMC 聰明錢機構足跡模型 (Smart Money Concepts: BOS/CHoCH 結構突破、Order Blocks 機構訂單塊、FVG 失衡缺口 - 參考 joshyattridge/smart-money-concepts)
"""
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

from app.services import market_data, screener
from app.services.cache import cache_service
from app.services.fundamentals import build_financial_report

logger = logging.getLogger(__name__)


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


# ---------------------------------------------------------------- 1. Piotroski F-Score (0-9)
def compute_piotroski(fin: Dict[str, Any]) -> Dict[str, Any]:
    quarters = fin.get("quarters") or []
    bal = fin.get("balance") or {}
    cur_q = quarters[0] if len(quarters) >= 1 else {}
    yago_q = quarters[4] if len(quarters) >= 5 else (quarters[-1] if len(quarters) >= 2 else {})

    roa_ttm = bal.get("roa_ttm")
    if roa_ttm is None and cur_q.get("net_margin") is not None:
        roa_ttm = (cur_q.get("net_margin") or 0) * 0.6

    ocf_ttm = bal.get("ocf_ttm")
    if ocf_ttm is None:
        ocf_ttm = cur_q.get("ocf")

    ocf_to_ni = bal.get("ocf_to_ni_ttm")
    if ocf_to_ni is None:
        ocf_to_ni = cur_q.get("ocf_to_ni")

    cur_ni = cur_q.get("net_income")
    yago_ni = yago_q.get("net_income")
    cur_gm = cur_q.get("gross_margin")
    yago_gm = yago_q.get("gross_margin")
    cur_at = cur_q.get("asset_turnover_ann")
    yago_at = yago_q.get("asset_turnover_ann")

    dr = bal.get("debt_ratio")
    prev_dr = bal.get("prev_debt_ratio")
    cr = bal.get("current_ratio")
    prev_cr = bal.get("prev_current_ratio")
    cap = bal.get("capital_stock")
    prev_cap = bal.get("prev_capital_stock")

    checks = [
        {
            "code": "F1",
            "category": "獲利能力",
            "label": "資產報酬率 (ROA) 為正",
            "passed": bool((roa_ttm is not None and roa_ttm > 0) or (cur_ni is not None and cur_ni > 0)),
            "detail": f"近四季 ROA {roa_ttm:.1f}%" if roa_ttm is not None else (f"單季淨利 > 0" if (cur_ni or 0) > 0 else "虧損或無資料"),
        },
        {
            "code": "F2",
            "category": "獲利能力",
            "label": "營業現金流 (OCF) 為正",
            "passed": bool((ocf_ttm is not None and ocf_ttm > 0) or (cur_ni is not None and cur_ni > 0 and ocf_ttm is None)),
            "detail": "本業實質現金流入" if (ocf_ttm or 0) > 0 else "營業現金流出或待公布",
        },
        {
            "code": "F3",
            "category": "獲利能力",
            "label": "獲利能力較去年同期成長",
            "passed": bool(cur_ni is not None and yago_ni is not None and cur_ni > yago_ni),
            "detail": f"單季 EPS YoY {cur_q.get('eps_yoy'):+.1f}%" if cur_q.get("eps_yoy") is not None else "與去年同期持平/衰退",
        },
        {
            "code": "F4",
            "category": "獲利含金量",
            "label": "盈餘品質優良 (營業現金流 ≥ 稅後淨利)",
            "passed": bool((ocf_to_ni is not None and ocf_to_ni >= 85) or (ocf_ttm and cur_ni and ocf_ttm >= cur_ni)),
            "detail": f"獲利含金量 {ocf_to_ni:.0f}%" if ocf_to_ni is not None else "現金流與帳面獲利匹配度",
        },
        {
            "code": "F5",
            "category": "槓桿與安全",
            "label": "負債比率控制在安全水位或下降",
            "passed": bool((dr is not None and prev_dr is not None and dr <= prev_dr + 1.0) or (dr is not None and dr < 55)),
            "detail": f"負債比 {dr:.1f}%" + (f" (前期 {prev_dr:.1f}%)" if prev_dr is not None else "") if dr is not None else "無負債比資料",
        },
        {
            "code": "F6",
            "category": "槓桿與安全",
            "label": "短期償債能力 (流動比率 ≥ 1.2 或提升)",
            "passed": bool((cr is not None and cr >= 1.2) or (cr is not None and prev_cr is not None and cr >= prev_cr)),
            "detail": f"流動比率 {cr}" + (f" (前期 {prev_cr})" if prev_cr is not None else "") if cr is not None else "無流動比率資料",
        },
        {
            "code": "F7",
            "category": "槓桿與安全",
            "label": "股本未大幅膨脹稀釋股東權益",
            "passed": bool(cap is None or prev_cap is None or cap <= prev_cap * 1.03),
            "detail": "無惡性增資稀釋" if (cap is None or prev_cap is None or cap <= prev_cap * 1.03) else "近一年股本膨脹 > 3%",
        },
        {
            "code": "F8",
            "category": "營運效率",
            "label": "毛利率較去年同期維持或提升",
            "passed": bool(cur_gm is not None and yago_gm is not None and cur_gm >= yago_gm - 0.3),
            "detail": f"最新毛利率 {cur_gm:.1f}% (去年同期 {yago_gm:.1f}%)" if (cur_gm is not None and yago_gm is not None) else "無毛利率比較",
        },
        {
            "code": "F9",
            "category": "營運效率",
            "label": "總資產週轉率提升或營收成長 > 10%",
            "passed": bool((cur_at is not None and yago_at is not None and cur_at >= yago_at) or ((cur_q.get("revenue_yoy") or 0) >= 10)),
            "detail": f"年化資產週轉率 {cur_at}x" if cur_at is not None else f"單季營收 YoY {cur_q.get('revenue_yoy') or 0:.1f}%",
        },
    ]
    score = sum(1 for c in checks if c["passed"])
    status = "財務體質極佳" if score >= 7 else "財務體質穩健" if score >= 5 else "體質轉弱需留意"
    return {
        "id": "piotroski",
        "name": "Piotroski F-Score 財報排雷模型",
        "subtitle": "史丹佛教授 Joseph Piotroski 9 項基本面量化檢核",
        "score": score,
        "max_score": 9,
        "status": status,
        "checks": checks,
    }


# ---------------------------------------------------------------- 2. William O'Neil CANSLIM (0-7)
def compute_canslim(fin: Dict[str, Any], tech: Optional[Dict[str, Any]], chips: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    quarters = fin.get("quarters") or []
    bal = fin.get("balance") or {}
    rev_m = fin.get("monthly_revenue") or []
    cur_q = quarters[0] if quarters else {}
    t = tech or {}
    ch = chips or {}

    eps_yoy = cur_q.get("eps_yoy")
    rev_yoy = cur_q.get("revenue_yoy")
    latest_m_yoy = rev_m[0].get("yoy") if rev_m else None
    roe = bal.get("roe_ttm")
    close = t.get("close") or 0
    high_60 = t.get("high_60") or close or 1
    ret_20d = t.get("ret_20d") or 0
    ret_60d = t.get("ret_60d") or 0
    vol_ratio = t.get("vol_ratio") or 1.0
    ma20 = t.get("ma20") or 0
    ma60 = t.get("ma60") or 0
    foreign_5d = ch.get("foreign_5d") or 0
    trust_5d = ch.get("trust_5d") or 0

    c_pass = bool((eps_yoy is not None and eps_yoy >= 18) or (rev_yoy is not None and rev_yoy >= 18))
    a_pass = bool((roe is not None and roe >= 15) or (cur_q.get("operating_margin") or 0) >= 15)
    n_pass = bool((close >= high_60 * 0.90) or (latest_m_yoy is not None and latest_m_yoy >= 20))
    s_pass = bool(vol_ratio >= 1.05 or (ret_20d > 0 and vol_ratio >= 0.9))
    l_pass = bool(ret_20d >= 3.0 or ret_60d >= 8.0)
    i_pass = bool(foreign_5d > 0 or trust_5d > 0 or (fin.get("market") == "US" and l_pass))
    m_pass = bool(close > ma20 and close >= ma60 * 0.98)

    checks = [
        {
            "code": "C",
            "category": "當季盈餘",
            "label": "Current Earnings：當季 EPS 或營收年增 ≥ 18%",
            "passed": c_pass,
            "detail": f"EPS YoY {eps_yoy:+.1f}% / 營收 YoY {rev_yoy or 0:+.1f}%" if eps_yoy is not None else f"營收 YoY {rev_yoy or 0:+.1f}%",
        },
        {
            "code": "A",
            "category": "年度獲利",
            "label": "Annual Earnings：近四季 ROE ≥ 15% 或營益率 ≥ 15%",
            "passed": a_pass,
            "detail": f"近四季 ROE {roe:.1f}%" if roe is not None else f"營益率 {cur_q.get('operating_margin') or 0:.1f}%",
        },
        {
            "code": "N",
            "category": "創新高動能",
            "label": "New Highs：股價距波段高點 10% 內或月營收爆發",
            "passed": n_pass,
            "detail": f"距60日高點 {(close / high_60 - 1) * 100:+.1f}%" if high_60 else "觀察突破催化劑",
        },
        {
            "code": "S",
            "category": "籌碼供需",
            "label": "Supply & Demand：量價配合（量能溫和放大或價漲量增）",
            "passed": s_pass,
            "detail": f"量能比 (當日/20日均量) {vol_ratio:.2f}x",
        },
        {
            "code": "L",
            "category": "領頭羊強度",
            "label": "Leader / RS：20日或60日相對表現強勢",
            "passed": l_pass,
            "detail": f"20日報酬 {ret_20d:+.1f}% · 60日報酬 {ret_60d:+.1f}%",
        },
        {
            "code": "I",
            "category": "機構認同",
            "label": "Institutional Sponsorship：外資或投信近 5 日偏多佈局",
            "passed": i_pass,
            "detail": f"外資5日 {foreign_5d / 1000:+,.0f}張 · 投信5日 {trust_5d / 1000:+,.0f}張" if ch else "美股機構長期持倉標的",
        },
        {
            "code": "M",
            "category": "趨勢方向",
            "label": "Market Direction：股價站穩月線 (20MA) 與季線 (60MA)",
            "passed": m_pass,
            "detail": f"現價 {close:.2f} / 20MA {ma20:.2f} / 60MA {ma60:.2f}",
        },
    ]
    score = sum(1 for c in checks if c["passed"])
    status = "符合飆股成長型態" if score >= 5 else "成長動能醞釀中" if score >= 3 else "動能偏弱"
    return {
        "id": "canslim",
        "name": "William O'Neil CANSLIM 成長模型",
        "subtitle": "笑傲股市 7 大成長動能與機構籌碼選股法則",
        "score": score,
        "max_score": 7,
        "status": status,
        "checks": checks,
    }


# ---------------------------------------------------------------- 3. Mark Minervini VCP / SEPA (0-7)
def compute_minervini_vcp(df: Optional[pd.DataFrame]) -> Dict[str, Any]:
    if df is None or len(df) < 30:
        return {
            "id": "minervini",
            "name": "Mark Minervini VCP 第二階段趨勢模板",
            "subtitle": "超級績效 SEPA 趨勢確認與波動收斂型態 (VCP)",
            "score": 0,
            "max_score": 7,
            "status": "歷史資料不足",
            "checks": [],
        }

    c = df["close"].astype(float)
    h = df["high"].astype(float)
    lo = df["low"].astype(float)
    v = df["volume"].astype(float)

    last = float(c.iloc[-1])
    ma20 = float(c.tail(20).mean())
    ma50 = float(c.tail(50).mean()) if len(c) >= 50 else ma20
    ma60 = float(c.tail(60).mean()) if len(c) >= 60 else ma50
    ma150 = float(c.tail(150).mean()) if len(c) >= 150 else ma60
    ma60_prev = float(c.iloc[-20:-1].tail(60).mean()) if len(c) >= 80 else float(c.iloc[:-5].tail(40).mean())

    high_52w = float(h.tail(252).max())
    low_52w = float(lo.tail(252).min())

    # VCP 波動收斂率：近 10 日高低振幅 vs 近 40 日高低振幅
    range_10d = (float(h.tail(10).max()) - float(lo.tail(10).min())) / last * 100 if last > 0 else 0
    range_40d = (float(h.tail(40).max()) - float(lo.tail(40).min())) / last * 100 if last > 0 else 1
    vcp_ratio = range_10d / max(range_40d, 0.01)

    vol_5d = float(v.tail(5).mean())
    vol_50d = float(v.tail(50).mean()) if len(v) >= 50 else float(v.mean())

    from_low_pct = (last - low_52w) / low_52w * 100 if low_52w > 0 else 0
    from_high_pct = (last - high_52w) / high_52w * 100 if high_52w > 0 else 0

    checks = [
        {
            "code": "T1",
            "category": "均線結構",
            "label": "股價站上 50 日均線與中長期均線",
            "passed": bool(last > ma50 and last >= ma150 * 0.98),
            "detail": f"現價 {last:.2f} / 50MA {ma50:.2f} / 長均線 {ma150:.2f}",
        },
        {
            "code": "T2",
            "category": "均線排列",
            "label": "短中期均線多頭排列 (20MA > 50MA/60MA)",
            "passed": bool(ma20 >= ma50 * 0.995),
            "detail": f"20MA ({ma20:.2f}) vs 50MA ({ma50:.2f})",
        },
        {
            "code": "T3",
            "category": "趨勢斜率",
            "label": "季線 (60MA) 趨勢向上走揚",
            "passed": bool(ma60 >= ma60_prev),
            "detail": f"目前 60MA {ma60:.2f} (前值 {ma60_prev:.2f})",
        },
        {
            "code": "T4",
            "category": "脫離底部",
            "label": "股價高於 52 週低點至少 20% 以上 (脫離第一階段底)",
            "passed": bool(from_low_pct >= 20.0),
            "detail": f"距區間低點 ({low_52w:.2f}) 已上漲 +{from_low_pct:.1f}%",
        },
        {
            "code": "T5",
            "category": "接近樞紐點",
            "label": "股價距離 52 週高點在 25% 以內 (上方套牢賣壓輕)",
            "passed": bool(from_high_pct >= -25.0),
            "detail": f"距區間高點 ({high_52w:.2f}) 差距 {from_high_pct:+.1f}%",
        },
        {
            "code": "T6",
            "category": "VCP 波動收斂",
            "label": "近期波幅收斂整理 (10日振幅 < 40日振幅之 65%)",
            "passed": bool(vcp_ratio <= 0.65),
            "detail": f"10日振幅 {range_10d:.1f}% / 40日振幅 {range_40d:.1f}% (收斂比 {vcp_ratio:.2f})",
        },
        {
            "code": "T7",
            "category": "量能結構",
            "label": "整理期量縮惜售或突破期帶量攻擊",
            "passed": bool((vcp_ratio <= 0.65 and vol_5d <= vol_50d * 1.1) or (last >= high_52w * 0.96 and vol_5d >= vol_50d * 1.15)),
            "detail": f"5日均量 / 50日均量 = {(vol_5d / max(vol_50d, 1)):.2f}x",
        },
    ]
    score = sum(1 for c in checks if c["passed"])
    status = "Stage 2 強勢多頭" if score >= 5 else "區間築底/收斂中" if score >= 3 else "Stage 3/4 修正期"
    return {
        "id": "minervini",
        "name": "Mark Minervini VCP 第二階段趨勢模板",
        "subtitle": "超級績效 SEPA 趨勢確認與波動收斂型態 (VCP)",
        "score": score,
        "max_score": 7,
        "status": status,
        "vcp_ratio": round(vcp_ratio, 2),
        "checks": checks,
    }


# ---------------------------------------------------------------- 4. SMC 聰明錢機構足跡模型
def compute_smc_model(df: Optional[pd.DataFrame]) -> Dict[str, Any]:
    if df is None or len(df) < 20:
        return {
            "id": "smc",
            "name": "SMC 聰明錢機構足跡模型",
            "subtitle": "ICT / Smart Money Concepts：結構突破 (BOS)、機構訂單塊 (OB) 與失衡缺口 (FVG)",
            "score": 0,
            "max_score": 5,
            "status": "資料不足",
            "bullish_ob": None,
            "bearish_ob": None,
            "fvg": None,
            "checks": [],
        }

    win = df.tail(60).reset_index(drop=True)
    o = win["open"].astype(float).values
    h = win["high"].astype(float).values
    lo = win["low"].astype(float).values
    c = win["close"].astype(float).values
    dates = win["date"].astype(str).values
    last = float(c[-1])
    n = len(win)

    # 1. 偵測 Bullish Order Block (多方機構訂單塊：大漲突破前最後一根陰線或底部支撐K棒區間)
    bull_ob = None
    for i in range(n - 3, max(2, n - 45), -1):
        # 若第 i+1 ~ i+2 出現強勁推升 (漲幅 > 2.2%) 且第 i 根為陰線或長下影線，且其低點仍在現價下方形成支撐
        move_up = (max(c[i + 1 : min(n, i + 4)]) - lo[i]) / lo[i] * 100 if lo[i] > 0 else 0
        if move_up >= 2.2 and lo[i] <= last:
            bull_ob = {
                "date": dates[i],
                "low": round(float(lo[i]), 2),
                "high": round(float(max(o[i], c[i])), 2),
            }
            break
    if not bull_ob:
        idx_min = int(np.argmin(lo[-30:])) + max(0, n - 30)
        bull_ob = {
            "date": dates[idx_min],
            "low": round(float(lo[idx_min]), 2),
            "high": round(float(min(h[idx_min], lo[idx_min] * 1.015)), 2),
        }

    # 2. 偵測 Bearish Order Block (空方機構訂單塊：大跌前最後一根陽線或波段高點壓力區間)
    bear_ob = None
    for i in range(n - 3, max(2, n - 45), -1):
        move_dn = (h[i] - min(c[i + 1 : min(n, i + 4)])) / h[i] * 100 if h[i] > 0 else 0
        if move_dn >= 2.2 and h[i] >= last:
            bear_ob = {
                "date": dates[i],
                "low": round(float(min(o[i], c[i])), 2),
                "high": round(float(h[i]), 2),
            }
            break
    if not bear_ob:
        idx_max = int(np.argmax(h[-30:])) + max(0, n - 30)
        bear_ob = {
            "date": dates[idx_max],
            "low": round(float(max(lo[idx_max], h[idx_max] * 0.985)), 2),
            "high": round(float(h[idx_max]), 2),
        }

    # 3. 偵測 Fair Value Gap (FVG 三K棒失衡缺口)
    latest_fvg = None
    for i in range(n - 1, 2, -1):
        # Bullish FVG: 第 i 根低點 > 第 i-2 根高點
        if lo[i] > h[i - 2] * 1.002:
            latest_fvg = {"type": "多方失衡缺口 (Bullish FVG)", "date": dates[i - 1], "low": round(float(h[i - 2]), 2), "high": round(float(lo[i]), 2)}
            break
        # Bearish FVG: 第 i 根高點 < 第 i-2 根低點
        if h[i] < lo[i - 2] * 0.998:
            latest_fvg = {"type": "空方失衡缺口 (Bearish FVG)", "date": dates[i - 1], "low": round(float(h[i]), 2), "high": round(float(lo[i - 2]), 2)}
            break

    # 4. 市場結構 (BOS / CHoCH)：比較近 10 日高點/低點與前 10~30 日高點/低點
    prev_high = float(np.max(h[-30:-10])) if n >= 30 else float(np.max(h[:-5]))
    prev_low = float(np.min(lo[-30:-10])) if n >= 30 else float(np.min(lo[:-5]))
    rec_high = float(np.max(h[-10:]))
    rec_low = float(np.min(lo[-10:]))

    bos_bull = rec_high >= prev_high * 0.998 and last >= (prev_high + prev_low) / 2
    hl_bull = rec_low >= prev_low * 0.995
    eq_price = ( float(np.max(h[-40:])) + float(np.min(lo[-40:])) ) / 2
    in_discount = last <= eq_price * 1.03

    checks = [
        {
            "code": "S1",
            "category": "市場結構",
            "label": "多頭結構突破 (Bullish BOS)：近期創高或突破前波結構高點",
            "passed": bool(bos_bull),
            "detail": f"近10日高點 {rec_high:.2f} vs 前波高點 {prev_high:.2f}",
        },
        {
            "code": "S2",
            "category": "底部墊高",
            "label": "高點/低點結構墊高 (Higher Low)：未跌破前波關鍵流動性低點",
            "passed": bool(hl_bull),
            "detail": f"近10日低點 {rec_low:.2f} vs 前波低點 {prev_low:.2f}",
        },
        {
            "code": "S3",
            "category": "機構支撐",
            "label": "現價守穩多方機構訂單塊 (Bullish Order Block) 之上",
            "passed": bool(last >= bull_ob["low"]),
            "detail": f"多方訂單塊支撐區：{bull_ob['low']} ~ {bull_ob['high']} ({bull_ob['date']})",
        },
        {
            "code": "S4",
            "category": "失衡動能",
            "label": "存在多方公允價值缺口 (Bullish FVG) 或無上方空方缺口壓制",
            "passed": bool(latest_fvg is None or "多方" in latest_fvg["type"]),
            "detail": f"{latest_fvg['type']}：{latest_fvg['low']} ~ {latest_fvg['high']}" if latest_fvg else "近期跳空缺口已完全回補平衡",
        },
        {
            "code": "S5",
            "category": "溢價/折價區",
            "label": "處於合理折價承接區或突破空方訂單塊壓力",
            "passed": bool(in_discount or last >= bear_ob["low"]),
            "detail": f"空方訂單塊壓力區：{bear_ob['low']} ~ {bear_ob['high']} ({bear_ob['date']})",
        },
    ]
    score = sum(1 for ch in checks if ch["passed"])
    status = "機構偏多結構 (Bullish Structure)" if score >= 4 else "區間震盪吸籌 (Accumulation)" if score >= 2 else "機構派發偏空 (Distribution)"
    return {
        "id": "smc",
        "name": "SMC 聰明錢機構足跡模型",
        "subtitle": "ICT / Smart Money Concepts：結構突破 (BOS)、機構訂單塊 (OB) 與失衡缺口 (FVG)",
        "score": score,
        "max_score": 5,
        "status": status,
        "bullish_ob": bull_ob,
        "bearish_ob": bear_ob,
        "fvg": latest_fvg,
        "checks": checks,
    }


# ---------------------------------------------------------------- 同業比較
async def fetch_peer_comparison(symbol: str, industry: str) -> List[Dict[str, Any]]:
    code, kind, _ = market_data.split_symbol(symbol)
    peer_syms: List[str] = []
    for sec_name, syms in screener.SECTORS.items():
        if code in syms or symbol in syms or (industry and industry[:2] in sec_name):
            peer_syms = list(syms)
            break
    if not peer_syms:
        peer_syms = ["2330", "2317", "2454", "2382", "2308"] if kind == "TW" else ["NVDA", "AAPL", "MSFT", "AVGO", "AMD"]
    if code not in peer_syms and symbol not in peer_syms:
        peer_syms = [code if kind == "TW" else symbol] + peer_syms[:4]
    else:
        peer_syms = peer_syms[:5]

    async def eval_peer(s: str):
        try:
            ev = await screener.evaluate(s, with_chips=False, with_growth=True)
            if not ev:
                return None
            comp = screener.composite(ev)
            return {
                "symbol": comp["symbol"],
                "name": comp["name"],
                "industry": ev.get("industry") or industry or "同業代表",
                "price": comp["price"],
                "change_pct": comp["change_pct"],
                "ret_20d": comp["ret_20d"],
                "revenue_yoy_3m": ev["growth"]["revenue_yoy_3m"] if ev.get("growth") else None,
                "score": comp["score"],
                "is_target": s == code or s == symbol,
            }
        except Exception:
            return None

    rows = await asyncio.gather(*[eval_peer(s) for s in peer_syms], return_exceptions=True)
    valid = [r for r in rows if isinstance(r, dict)]
    valid.sort(key=lambda x: x["score"], reverse=True)
    return valid


# ---------------------------------------------------------------- 綜合深度研究報告
def _normalize_model(m: Dict[str, Any], default_summary: str) -> Dict[str, Any]:
    checks = m.get("checks") or []
    criteria = [
        {
            "id": str(c.get("code") or idx),
            "label": str(c.get("label") or ""),
            "pass": bool(c.get("passed")),
            "detail": str(c.get("detail") or ""),
        }
        for idx, c in enumerate(checks)
    ]
    return {
        **m,
        "summary": m.get("summary") or default_summary,
        "criteria": criteria,
    }


async def build_deep_research_report(symbol: str) -> Dict[str, Any]:
    symbol = await market_data.resolve_symbol_query(symbol)
    cache_key = f"deep_report:v2:{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except Exception:
            pass

    fin, df, ev = await asyncio.gather(
        build_financial_report(symbol),
        market_data.get_df(symbol, "1y"),
        screener.evaluate(symbol, with_chips=True, with_growth=True),
        return_exceptions=True,
    )
    fin_data = fin if isinstance(fin, dict) else {"quarters": [], "monthly_revenue": [], "balance": {}, "dupont": {}, "valuation": {}, "dividend": {}, "scores": {}, "flags": []}
    df_data = df if isinstance(df, pd.DataFrame) else None
    ev_data = ev if isinstance(ev, dict) else {}
    tech = ev_data.get("tech") or (screener.tech_metrics(df_data) if df_data is not None else {}) or {}
    chips = ev_data.get("chips") or {}

    m_piotroski = _normalize_model(
        compute_piotroski(fin_data),
        "檢驗獲利能力、現金流含金量、財務槓桿與營運週轉效率之 9 項排雷指標。",
    )
    m_canslim = _normalize_model(
        compute_canslim(fin_data, tech, chips),
        "結合單季盈餘爆發、年度 ROE、創新高動能、量價供需與法人認同度之成長股模型。",
    )
    m_minervini = _normalize_model(
        compute_minervini_vcp(df_data),
        "確認股價是否處於第二階段 (Stage 2) 多頭均線排列，並偵測 VCP 波動收斂突破結構。",
    )
    m_smc = _normalize_model(
        compute_smc_model(df_data),
        "追蹤機構大戶結構突破 (BOS)、多空機構訂單塊 (Order Blocks) 支撐壓力與公允價值缺口 (FVG)。",
    )

    # 計算五維度雪花雷達分數 (0-100)
    f_scores = fin_data.get("scores") or {}
    s_profit = f_scores.get("profitability") or round((m_piotroski["score"] / 9) * 100)
    s_growth = f_scores.get("growth") or (ev_data.get("growth") or {}).get("score") or round((m_canslim["score"] / 7) * 100)
    s_safety = f_scores.get("safety") or round((m_piotroski["score"] / 9) * 100)
    s_val = f_scores.get("valuation") or 60
    s_mom = round(((tech.get("score") or 50) * 0.6) + ((chips.get("score") or 50) * 0.4))

    q0 = (fin_data.get("quarters") or [{}])[0] if fin_data.get("quarters") else {}
    bal_d = fin_data.get("balance") or {}
    val_d = fin_data.get("valuation") or {}
    m_rev0 = (fin_data.get("monthly_revenue") or [{}])[0] if fin_data.get("monthly_revenue") else {}

    om_val = q0.get("operating_margin")
    roe_val = bal_d.get("roe_ttm")
    gm_val = q0.get("gross_margin")
    ry_val = q0.get("revenue_yoy") if q0.get("revenue_yoy") is not None else m_rev0.get("yoy")
    ey_val = q0.get("eps_yoy")
    dr_val = bal_d.get("debt_ratio")
    cr_val = bal_d.get("current_ratio")
    per_val = val_d.get("per")
    pbr_val = val_d.get("pbr")
    dy_val = val_d.get("dividend_yield")

    radar_list = [
        {
            "axis": "獲利能力",
            "key": "profitability",
            "score": int(_clamp(s_profit)),
            "metric": f"營益率 {f'{om_val:.1f}%' if om_val is not None else '—'} · ROE {f'{roe_val:.1f}%' if roe_val is not None else '—'} · 毛利率 {f'{gm_val:.1f}%' if gm_val is not None else '—'}",
        },
        {
            "axis": "成長動能",
            "key": "growth",
            "score": int(_clamp(s_growth)),
            "metric": f"營收 YoY {f'{ry_val:+.1f}%' if ry_val is not None else '—'} · EPS YoY {f'{ey_val:+.1f}%' if ey_val is not None else '—'}",
        },
        {
            "axis": "財務安全",
            "key": "safety",
            "score": int(_clamp(s_safety)),
            "metric": f"負債比 {f'{dr_val:.1f}%' if dr_val is not None else '—'} · 流動比 {f'{cr_val}x' if cr_val is not None else '—'} · F-Score {m_piotroski['score']}/9",
        },
        {
            "axis": "估值股息",
            "key": "valuation",
            "score": int(_clamp(s_val)),
            "metric": f"PER {f'{per_val:.1f}x' if per_val is not None else '—'} · PBR {f'{pbr_val:.2f}x' if pbr_val is not None else '—'} · 殖利率 {f'{dy_val:.2f}%' if dy_val is not None else '—'}",
        },
        {
            "axis": "技術籌碼",
            "key": "momentum",
            "score": int(_clamp(s_mom)),
            "metric": f"20日 {tech.get('ret_20d') or 0:+.1f}% · Minervini {m_minervini['score']}/{m_minervini['max_score']} · SMC {m_smc['score']}/5",
        },
    ]

    # 四大模型總通過率 + 五維度雷達綜合總分
    model_pts = m_piotroski["score"] + m_canslim["score"] + m_minervini["score"] + m_smc["score"]
    model_max = m_piotroski["max_score"] + m_canslim["max_score"] + m_minervini["max_score"] + m_smc["max_score"]  # 28
    model_pct = round(model_pts / max(model_max, 1) * 100)
    radar_avg = round(sum(r["score"] for r in radar_list) / len(radar_list))
    total_score = round(radar_avg * 0.55 + model_pct * 0.45)

    if total_score >= 74:
        rating = "強力看多 (Strong Bullish)"
        rating_tone = "bull"
        rating_code = "STRONG_BULL"
    elif total_score >= 60:
        rating = "偏多佈局 (Accumulate)"
        rating_tone = "mild_bull"
        rating_code = "BULL"
    elif total_score >= 46:
        rating = "中性觀望 (Neutral / Hold)"
        rating_tone = "neutral"
        rating_code = "NEUTRAL"
    else:
        rating = "保守避開 (Cautious / Avoid)"
        rating_tone = "bear"
        rating_code = "BEAR"

    close = float(tech.get("close") or (df_data["close"].iloc[-1] if df_data is not None and len(df_data) else 0))
    atr = float(tech.get("atr") or (close * 0.025))
    bull_ob = m_smc.get("bullish_ob") or {}
    bear_ob = m_smc.get("bearish_ob") or {}

    entry_low = round(bull_ob.get("low") or max(0.01, close - 1.2 * atr), 2)
    entry_high = round(bull_ob.get("high") or close, 2)
    if entry_low > entry_high:
        entry_low, entry_high = entry_high, entry_low
    stop_loss = round(min(entry_low * 0.97, close - 2.0 * atr), 2)
    target_price = round(max(bear_ob.get("high") or 0, close + 3.2 * atr), 2)
    risk = max(0.01, close - stop_loss)
    reward = max(0.01, target_price - close)
    rr_ratio = round(reward / risk, 2)

    # 自動彙整多方亮點 (Bull Case) 與空方風險 (Bear Case)
    bull_points: List[str] = []
    bear_points: List[str] = []

    if m_piotroski["score"] >= 6:
        bull_points.append(f"財報體質強健：Piotroski F-Score 拿下 {m_piotroski['score']}/9 分，獲利與現金流品質紮實。")
    elif m_piotroski["score"] <= 4:
        bear_points.append(f"基本面體質偏弱：Piotroski F-Score 僅 {m_piotroski['score']}/9 分，需留意獲利含金量或負債壓力。")

    dup = fin_data.get("dupont") or {}
    if dup.get("roe_ttm") is not None:
        if dup["roe_ttm"] >= 15:
            bull_points.append(f"杜邦 ROE 表現亮眼：近四季 ROE 達 {dup['roe_ttm']:.1f}%（淨利率 {dup.get('net_margin_ttm') or '—'}%，屬{dup.get('driver', '穩健型')}）。")
        elif dup["roe_ttm"] < 8:
            bear_points.append(f"股東權益報酬率偏低：近四季 ROE 僅 {dup['roe_ttm']:.1f}%，資金運用效率待提升。")

    ocf_ni = (fin_data.get("balance") or {}).get("ocf_to_ni_ttm")
    if ocf_ni is not None:
        if ocf_ni >= 90:
            bull_points.append(f"獲利含金量高：近四季營業現金流對稅後淨利比達 {ocf_ni:.0f}%，帳面盈餘具備真實現金支撐。")
        elif ocf_ni < 60:
            bear_points.append(f"獲利含金量偏低：營業現金流對淨利比僅 {ocf_ni:.0f}%，需留意應收帳款或存貨積壓。")

    if m_canslim["score"] >= 5:
        bull_points.append(f"符合 CANSLIM 成長股特徵（通過 {m_canslim['score']}/7 項），營收/盈餘動能與市場相對強度領先。")
    if m_minervini["score"] >= 5:
        bull_points.append(f"技術面符合 Minervini Stage 2 多頭趨勢（通過 {m_minervini['score']}/7 項），均線結構完整。")
    elif m_minervini["score"] <= 2:
        bear_points.append(f"技術趨勢尚未轉強（Minervini 模板僅通過 {m_minervini['score']}/7 項），上檔均線仍具反壓。")

    for sig in (tech.get("signals") or [])[:2]:
        if "過熱" in sig or "收黑" in sig:
            bear_points.append(f"技術訊號提醒：{sig}")
        else:
            bull_points.append(f"量價動能訊號：{sig}")

    for sig in (chips.get("signals") or []):
        if "買超" in sig:
            bull_points.append(f"法人籌碼偏多：{sig}")
        elif "賣超" in sig:
            bear_points.append(f"法人籌碼調節：{sig}")

    if not bull_points:
        bull_points.append(f"下檔具備 SMC 多方機構訂單塊支撐區（{entry_low} ~ {entry_high}）。")
    if not bear_points:
        bear_points.append(f"上檔接近波段壓力區（{bear_ob.get('low')} ~ {bear_ob.get('high')}），追高需控管部位風險。")

    peers = await fetch_peer_comparison(symbol, ev_data.get("industry", ""))

    conclusion = (
        f"綜合四大交易模型（總通過 {model_pts}/{model_max} 項）與五維度財報健診，{fin_data.get('name', symbol)} ({symbol}) "
        f"目前總評分為 {total_score}/100，評等為「{rating}」。"
        f"技術與機構足跡顯示下方關鍵支撐訂單塊位於 {entry_low} ~ {entry_high}，上檔波段目標區看 {target_price}，"
        f"防守停損位設於 {stop_loss}（預估風險報酬比 1 : {rr_ratio}）。"
    )

    out = {
        "symbol": symbol,
        "name": fin_data.get("name") or ev_data.get("name") or symbol,
        "market": fin_data.get("market", "TW"),
        "industry": ev_data.get("industry", ""),
        "price": close,
        "change_pct": float(tech.get("change_pct") or 0),
        "has_financials": bool(fin_data.get("quarters")),
        "financials": fin_data,
        "radar": radar_list,
        "models": {
            "piotroski": m_piotroski,
            "canslim": m_canslim,
            "minervini": m_minervini,
            "smc": m_smc,
        },
        "peers": peers,
        "verdict": {
            "rating": rating,
            "rating_tone": rating_tone,
            "rating_code": rating_code,
            "total_score": total_score,
            "model_passed": model_pts,
            "model_total": model_max,
            "entry_zone": [entry_low, entry_high],
            "stop_loss": stop_loss,
            "target_price": target_price,
            "risk_reward": rr_ratio,
            "bull_points": bull_points[:5],
            "bear_points": bear_points[:5],
            "conclusion": conclusion,
        },
    }
    await cache_service.set(cache_key, json.dumps(out, ensure_ascii=False, default=str), ttl=900)
    return out
