import pandas as pd
import numpy as np
from typing import Dict, List

def calculate_ma(df: pd.DataFrame, periods: List[int] = [5, 10, 20, 60, 120, 240]) -> Dict[str, float]:
    result = {}
    for p in periods:
        if len(df) >= p:
            result[f"MA{p}"] = float(df['close'].rolling(window=p).mean().iloc[-1])
    return result

def calculate_rsi(df: pd.DataFrame, period: int = 14) -> float:
    if len(df) < period:
        return 50.0
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return float(rsi.iloc[-1])

def calculate_kdj(df: pd.DataFrame, n: int = 9, m1: int = 3, m2: int = 3) -> Dict[str, float]:
    if len(df) < n:
        return {"K": 50.0, "D": 50.0, "J": 50.0}
        
    low_min = df['low'].rolling(window=n).min()
    high_max = df['high'].rolling(window=n).max()
    rsv = (df['close'] - low_min) / (high_max - low_min) * 100
    
    k = rsv.ewm(com=m1-1, adjust=False).mean()
    d = k.ewm(com=m2-1, adjust=False).mean()
    j = 3 * k - 2 * d
    
    return {
        "K": float(k.iloc[-1]),
        "D": float(d.iloc[-1]),
        "J": float(j.iloc[-1])
    }

def calculate_boll(df: pd.DataFrame, period: int = 20, std: float = 2.0) -> Dict[str, float]:
    if len(df) < period:
        return {"upper": 0.0, "middle": 0.0, "lower": 0.0}
        
    middle = df['close'].rolling(window=period).mean()
    std_dev = df['close'].rolling(window=period).std()
    
    upper = middle + (std_dev * std)
    lower = middle - (std_dev * std)
    
    return {
        "upper": float(upper.iloc[-1]),
        "middle": float(middle.iloc[-1]),
        "lower": float(lower.iloc[-1])
    }

def calculate_macd(df: pd.DataFrame, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict[str, float]:
    if len(df) < slow:
        return {"macd": 0.0, "signal": 0.0, "histogram": 0.0}
        
    ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
    ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
    macd = ema_fast - ema_slow
    signal_line = macd.ewm(span=signal, adjust=False).mean()
    histogram = macd - signal_line
    
    return {
        "macd": float(macd.iloc[-1]),
        "signal": float(signal_line.iloc[-1]),
        "histogram": float(histogram.iloc[-1])
    }
