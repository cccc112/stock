import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from enum import Enum

class SignalDirection(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    NEUTRAL = "NEUTRAL"

class StrategySignal:
    def __init__(self, strategy: str, direction: SignalDirection, confidence: float, description: str):
        self.strategy = strategy
        self.direction = direction
        self.confidence = confidence
        self.description = description
    
    def to_dict(self):
        return {
            "strategy": self.strategy,
            "direction": self.direction.value,
            "confidence": self.confidence,
            "description": self.description
        }

def detect_golden_death_cross(df: pd.DataFrame, params: dict = None) -> Optional[StrategySignal]:
    params = params or {}
    ma_short = params.get('ma_short', 5)
    ma_mid = params.get('ma_mid', 20)
    ma_long = params.get('ma_long', 60)
    
    if len(df) < ma_long: return None
    ma5 = df['close'].rolling(ma_short).mean()
    ma20 = df['close'].rolling(ma_mid).mean()
    ma60 = df['close'].rolling(ma_long).mean()

    cross_5_20 = None
    for i in range(-3, 0):
        if ma5.iloc[i-1] <= ma20.iloc[i-1] and ma5.iloc[i] > ma20.iloc[i]:
            cross_5_20 = "GOLDEN"
        elif ma5.iloc[i-1] >= ma20.iloc[i-1] and ma5.iloc[i] < ma20.iloc[i]:
            cross_5_20 = "DEATH"
            
    cross_20_60 = None
    for i in range(-3, 0):
        if ma20.iloc[i-1] <= ma60.iloc[i-1] and ma20.iloc[i] > ma60.iloc[i]:
            cross_20_60 = "GOLDEN"
        elif ma20.iloc[i-1] >= ma60.iloc[i-1] and ma20.iloc[i] < ma60.iloc[i]:
            cross_20_60 = "DEATH"

    if cross_5_20 == "GOLDEN" and cross_20_60 == "GOLDEN":
        return StrategySignal("均線交叉", SignalDirection.BUY, 0.8, "MA5 突破 MA20 且 MA20 突破 MA60 (雙重黃金交叉)")
    elif cross_5_20 == "DEATH" and cross_20_60 == "DEATH":
        return StrategySignal("均線交叉", SignalDirection.SELL, 0.8, "MA5 跌破 MA20 且 MA20 跌破 MA60 (雙重死亡交叉)")
    elif cross_5_20 == "GOLDEN":
        return StrategySignal("均線交叉", SignalDirection.BUY, 0.6, "MA5 突破 MA20 (黃金交叉)")
    elif cross_5_20 == "DEATH":
        return StrategySignal("均線交叉", SignalDirection.SELL, 0.6, "MA5 跌破 MA20 (死亡交叉)")
    return None

def detect_ma_alignment(df: pd.DataFrame, params: dict = None) -> Optional[StrategySignal]:
    params = params or {}
    ma_short = params.get('ma_short', 5)
    ma_mid1 = params.get('ma_mid1', 10)
    ma_mid2 = params.get('ma_mid2', 20)
    ma_long = params.get('ma_long', 60)

    if len(df) < ma_long: return None
    ma5 = df['close'].rolling(ma_short).mean().iloc[-1]
    ma10 = df['close'].rolling(ma_mid1).mean().iloc[-1]
    ma20 = df['close'].rolling(ma_mid2).mean().iloc[-1]
    ma60 = df['close'].rolling(ma_long).mean().iloc[-1]

    if ma5 > ma10 > ma20 > ma60:
        return StrategySignal("均線排列", SignalDirection.BUY, 0.7, "均線多頭排列 (5>10>20>60)，趨勢偏多")
    elif ma5 < ma10 < ma20 < ma60:
        return StrategySignal("均線排列", SignalDirection.SELL, 0.7, "均線空頭排列 (5<10<20<60)，趨勢偏空")
    return None

def detect_macd_divergence(df: pd.DataFrame, params: dict = None) -> Optional[StrategySignal]:
    params = params or {}
    macd_fast = params.get('macd_fast', 12)
    macd_slow = params.get('macd_slow', 26)
    macd_signal = params.get('macd_signal', 9)

    if len(df) < 30: return None
    ema_fast = df['close'].ewm(span=macd_fast, adjust=False).mean()
    ema_slow = df['close'].ewm(span=macd_slow, adjust=False).mean()
    macd = ema_fast - ema_slow
    signal_line = macd.ewm(span=macd_signal, adjust=False).mean()
    hist = macd - signal_line

    prices = df['close'].values[-20:]
    hists = hist.values[-20:]

    p_max_idx = np.argmax(prices)
    h_max_idx = np.argmax(hists)
    p_min_idx = np.argmin(prices)
    h_min_idx = np.argmin(hists)

    if p_max_idx > h_max_idx and prices[-1] >= prices[p_max_idx] * 0.99 and hists[-1] < hists[h_max_idx]:
        return StrategySignal("MACD 背離", SignalDirection.SELL, 0.75, "MACD 頂背離：價格創高但 MACD 柱狀體走低")
    elif p_min_idx > h_min_idx and prices[-1] <= prices[p_min_idx] * 1.01 and hists[-1] > hists[h_min_idx]:
        return StrategySignal("MACD 背離", SignalDirection.BUY, 0.75, "MACD 底背離：價格創低但 MACD 柱狀體走高")
    return None

def detect_bollinger_squeeze(df: pd.DataFrame, params: dict = None) -> Optional[StrategySignal]:
    params = params or {}
    boll_period = params.get('boll_period', 20)
    boll_std = params.get('boll_std', 2)

    if len(df) < boll_period: return None
    middle = df['close'].rolling(window=boll_period).mean()
    std_dev = df['close'].rolling(window=boll_period).std()
    upper = middle + (std_dev * boll_std)
    lower = middle - (std_dev * boll_std)
    
    bandwidth = (upper - lower) / middle
    bw_min = bandwidth.rolling(window=20).min().iloc[-1]
    
    avg_vol = df['volume'].rolling(20).mean().iloc[-1]

    if bandwidth.iloc[-1] <= bw_min * 1.05:
        if df['close'].iloc[-1] > upper.iloc[-1] and df['volume'].iloc[-1] > avg_vol * 1.5:
            return StrategySignal("布林擠壓", SignalDirection.BUY, 0.85, "布林通道收斂至 20 日新低後，帶量突破上軌")
    return None

def detect_kdj_cross(df: pd.DataFrame, params: dict = None) -> Optional[StrategySignal]:
    params = params or {}
    kdj_n = params.get('kdj_n', 9)
    kdj_m1 = params.get('kdj_m1', 3)
    kdj_m2 = params.get('kdj_m2', 3)

    if len(df) < kdj_n: return None
    n, m1, m2 = kdj_n, kdj_m1, kdj_m2
    low_min = df['low'].rolling(window=n).min()
    high_max = df['high'].rolling(window=n).max()
    rsv = (df['close'] - low_min) / (high_max - low_min) * 100
    
    k = rsv.ewm(com=m1-1, adjust=False).mean()
    d = k.ewm(com=m2-1, adjust=False).mean()
    
    if k.iloc[-2] < d.iloc[-2] and k.iloc[-1] > d.iloc[-1] and k.iloc[-1] < 20:
        return StrategySignal("KDJ 交叉", SignalDirection.BUY, 0.8, "K 值於超賣區 (<20) 突破 D 值，形成黃金交叉")
    elif k.iloc[-2] > d.iloc[-2] and k.iloc[-1] < d.iloc[-1] and k.iloc[-1] > 80:
        return StrategySignal("KDJ 交叉", SignalDirection.SELL, 0.8, "K 值於超買區 (>80) 跌破 D 值，形成死亡交叉")
        
    if all(val > 80 for val in k.values[-3:]):
        return StrategySignal("KDJ 交叉", SignalDirection.SELL, 0.6, "K 值連續 3 日於超買區 (>80) 鈍化，留意高檔反轉風險")
        
    return None

def detect_volume_breakout(df: pd.DataFrame, params: dict = None) -> Optional[StrategySignal]:
    params = params or {}
    vol_ma = params.get('vol_ma', 50)

    if len(df) < vol_ma: return None
    vol_ma50 = df['volume'].rolling(vol_ma).mean().iloc[-1]
    prev_high = df['high'].iloc[-20:-1].max()
    
    is_bullish = df['close'].iloc[-1] > df['open'].iloc[-1]
    
    if df['volume'].iloc[-1] > vol_ma50 * 2 and df['close'].iloc[-1] > prev_high and is_bullish:
        return StrategySignal("爆量突破", SignalDirection.BUY, 0.8, "成交量大於 50 日均量 2 倍，且收紅 K 突破波段高點")
    return None

def run_all_strategies(df: pd.DataFrame, params: dict = None) -> List[Dict[str, Any]]:
    signals = []
    for detect_fn in [detect_golden_death_cross, detect_ma_alignment, detect_macd_divergence, detect_bollinger_squeeze, detect_kdj_cross, detect_volume_breakout]:
        try:
            result = detect_fn(df, params)
            if result:
                signals.append(result.to_dict())
        except Exception:
            pass
    return signals
