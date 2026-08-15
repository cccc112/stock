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

def detect_golden_death_cross(df: pd.DataFrame) -> Optional[StrategySignal]:
    if len(df) < 60: return None
    ma5 = df['close'].rolling(5).mean()
    ma20 = df['close'].rolling(20).mean()
    ma60 = df['close'].rolling(60).mean()

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
        return StrategySignal("Golden/Death Cross", SignalDirection.BUY, 0.8, "MA5 crossed MA20 and MA20 crossed MA60 upwards")
    elif cross_5_20 == "DEATH" and cross_20_60 == "DEATH":
        return StrategySignal("Golden/Death Cross", SignalDirection.SELL, 0.8, "MA5 crossed MA20 and MA20 crossed MA60 downwards")
    elif cross_5_20 == "GOLDEN":
        return StrategySignal("Golden/Death Cross", SignalDirection.BUY, 0.6, "MA5 crossed MA20 upwards")
    elif cross_5_20 == "DEATH":
        return StrategySignal("Golden/Death Cross", SignalDirection.SELL, 0.6, "MA5 crossed MA20 downwards")
    return None

def detect_ma_alignment(df: pd.DataFrame) -> Optional[StrategySignal]:
    if len(df) < 60: return None
    ma5 = df['close'].rolling(5).mean().iloc[-1]
    ma10 = df['close'].rolling(10).mean().iloc[-1]
    ma20 = df['close'].rolling(20).mean().iloc[-1]
    ma60 = df['close'].rolling(60).mean().iloc[-1]

    if ma5 > ma10 > ma20 > ma60:
        return StrategySignal("MA Alignment", SignalDirection.BUY, 0.7, "Bullish MA alignment (5>10>20>60)")
    elif ma5 < ma10 < ma20 < ma60:
        return StrategySignal("MA Alignment", SignalDirection.SELL, 0.7, "Bearish MA alignment (5<10<20<60)")
    return None

def detect_macd_divergence(df: pd.DataFrame) -> Optional[StrategySignal]:
    if len(df) < 30: return None
    ema_fast = df['close'].ewm(span=12, adjust=False).mean()
    ema_slow = df['close'].ewm(span=26, adjust=False).mean()
    macd = ema_fast - ema_slow
    signal_line = macd.ewm(span=9, adjust=False).mean()
    hist = macd - signal_line

    prices = df['close'].values[-20:]
    hists = hist.values[-20:]

    p_max_idx = np.argmax(prices)
    h_max_idx = np.argmax(hists)
    p_min_idx = np.argmin(prices)
    h_min_idx = np.argmin(hists)

    if p_max_idx > h_max_idx and prices[-1] >= prices[p_max_idx] * 0.99 and hists[-1] < hists[h_max_idx]:
        return StrategySignal("MACD Divergence", SignalDirection.SELL, 0.75, "Bearish divergence: price high but MACD lower")
    elif p_min_idx > h_min_idx and prices[-1] <= prices[p_min_idx] * 1.01 and hists[-1] > hists[h_min_idx]:
        return StrategySignal("MACD Divergence", SignalDirection.BUY, 0.75, "Bullish divergence: price low but MACD higher")
    return None

def detect_bollinger_squeeze(df: pd.DataFrame) -> Optional[StrategySignal]:
    if len(df) < 20: return None
    period = 20
    middle = df['close'].rolling(window=period).mean()
    std_dev = df['close'].rolling(window=period).std()
    upper = middle + (std_dev * 2)
    lower = middle - (std_dev * 2)
    
    bandwidth = (upper - lower) / middle
    bw_min = bandwidth.rolling(window=20).min().iloc[-1]
    
    avg_vol = df['volume'].rolling(20).mean().iloc[-1]

    if bandwidth.iloc[-1] <= bw_min * 1.05:
        if df['close'].iloc[-1] > upper.iloc[-1] and df['volume'].iloc[-1] > avg_vol * 1.5:
            return StrategySignal("Bollinger Squeeze", SignalDirection.BUY, 0.85, "Bandwidth at 20d low and price broke upper band with volume")
    return None

def detect_kdj_cross(df: pd.DataFrame) -> Optional[StrategySignal]:
    if len(df) < 9: return None
    n, m1, m2 = 9, 3, 3
    low_min = df['low'].rolling(window=n).min()
    high_max = df['high'].rolling(window=n).max()
    rsv = (df['close'] - low_min) / (high_max - low_min) * 100
    
    k = rsv.ewm(com=m1-1, adjust=False).mean()
    d = k.ewm(com=m2-1, adjust=False).mean()
    
    if k.iloc[-2] < d.iloc[-2] and k.iloc[-1] > d.iloc[-1] and k.iloc[-1] < 20:
        return StrategySignal("KDJ Cross", SignalDirection.BUY, 0.8, "K crossed D upwards in oversold zone")
    elif k.iloc[-2] > d.iloc[-2] and k.iloc[-1] < d.iloc[-1] and k.iloc[-1] > 80:
        return StrategySignal("KDJ Cross", SignalDirection.SELL, 0.8, "K crossed D downwards in overbought zone")
        
    if all(val > 80 for val in k.values[-3:]):
        return StrategySignal("KDJ Cross", SignalDirection.SELL, 0.6, "K stalling > 80 for 3 days")
        
    return None

def detect_volume_breakout(df: pd.DataFrame) -> Optional[StrategySignal]:
    if len(df) < 50: return None
    vol_ma50 = df['volume'].rolling(50).mean().iloc[-1]
    prev_high = df['high'].iloc[-20:-1].max()
    
    is_bullish = df['close'].iloc[-1] > df['open'].iloc[-1]
    
    if df['volume'].iloc[-1] > vol_ma50 * 2 and df['close'].iloc[-1] > prev_high and is_bullish:
        return StrategySignal("Volume Breakout", SignalDirection.BUY, 0.8, "Volume > 2x 50d MA and broke recent high with bullish candle")
    return None

def run_all_strategies(df: pd.DataFrame) -> List[Dict[str, Any]]:
    signals = []
    for detect_fn in [detect_golden_death_cross, detect_ma_alignment, detect_macd_divergence, detect_bollinger_squeeze, detect_kdj_cross, detect_volume_breakout]:
        try:
            result = detect_fn(df)
            if result:
                signals.append(result.to_dict())
        except Exception:
            pass
    return signals
