import pandas as pd
from typing import Dict, Any
from app.models.schemas import VolumeAnomalyResult, VolumeAnomalyType

def detect_volume_anomaly(df: pd.DataFrame, lookback: int = 60) -> VolumeAnomalyResult:
    if len(df) < lookback:
        return VolumeAnomalyResult(type=VolumeAnomalyType.NORMAL, confidence=0.0, details={})
        
    recent_df = df.tail(lookback)
    current = df.iloc[-1]
    
    high_60 = recent_df['high'].max()
    low_60 = recent_df['low'].min()
    
    ma20_vol = recent_df['volume'].rolling(window=20).mean().iloc[-1]
    
    vol_ratio = current['volume'] / ma20_vol if ma20_vol > 0 else 0
    
    price_to_high = current['close'] / high_60 if high_60 > 0 else 1
    price_to_low = current['close'] / low_60 if low_60 > 0 else 1
    
    anomaly_type = VolumeAnomalyType.NORMAL
    confidence = 0.0
    
    if vol_ratio > 2.0:
        if price_to_high >= 0.95:
            anomaly_type = VolumeAnomalyType.HIGH_SELL_PRESSURE
            confidence = min(100.0, (vol_ratio / 2.0) * 50)
        elif price_to_low <= 1.05:
            anomaly_type = VolumeAnomalyType.LOW_BUY_SUPPORT
            confidence = min(100.0, (vol_ratio / 2.0) * 50)
            
    return VolumeAnomalyResult(
        type=anomaly_type,
        confidence=float(confidence),
        details={"vol_ratio": float(vol_ratio), "price_to_high": float(price_to_high), "price_to_low": float(price_to_low)}
    )
