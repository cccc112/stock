import numpy as np
import pandas as pd
from typing import List
from app.models.schemas import VAPResult

def calculate_vap(df: pd.DataFrame, bins: int = 12) -> List[VAPResult]:
    if df.empty:
        return []
        
    prices = df['close'].values
    volumes = df['volume'].values
    
    hist, bin_edges = np.histogram(prices, bins=bins, weights=volumes)
    
    mean_vol = np.mean(hist)
    
    results = []
    for i in range(len(hist)):
        is_peak = bool(hist[i] > mean_vol * 1.5)
        results.append(VAPResult(
            price_range_start=float(bin_edges[i]),
            price_range_end=float(bin_edges[i+1]),
            volume=float(hist[i]),
            is_peak=is_peak
        ))
        
    return results
