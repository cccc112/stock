import pandas as pd
from typing import List
from app.models.schemas import SupportResistanceLevel, SupportResistanceType
from app.quant.vap import calculate_vap

def calculate_support_resistance(df: pd.DataFrame) -> List[SupportResistanceLevel]:
    levels = []
    if df.empty:
        return levels
        
    vap_results = calculate_vap(df)
    for v in vap_results:
        if v.is_peak:
            mid_price = (v.price_range_start + v.price_range_end) / 2
            levels.append(SupportResistanceLevel(
                price=float(mid_price),
                type=SupportResistanceType.SUPPORT if df['close'].iloc[-1] > mid_price else SupportResistanceType.RESISTANCE,
                strength=3
            ))
            
    # Simple MA based support/resistance
    for ma in [20, 60, 120]:
        if len(df) >= ma:
            ma_val = df['close'].rolling(window=ma).mean().iloc[-1]
            levels.append(SupportResistanceLevel(
                price=float(ma_val),
                type=SupportResistanceType.SUPPORT if df['close'].iloc[-1] > ma_val else SupportResistanceType.RESISTANCE,
                strength=2
            ))
            
    return sorted(levels, key=lambda x: x.price)
