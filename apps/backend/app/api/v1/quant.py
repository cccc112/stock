from fastapi import APIRouter, HTTPException
from app.models.schemas import QuantAnalysis, VAPResult, VolumeAnomalyResult, SupportResistanceLevel
from app.services.yahoo import yahoo_service
from app.quant.vap import calculate_vap
from app.quant.volume_anomaly import detect_volume_anomaly
from app.quant.support_resistance import calculate_support_resistance
from app.quant.indicators import calculate_ma, calculate_rsi, calculate_kdj, calculate_boll, calculate_macd
import pandas as pd

router = APIRouter()

def get_df(symbol: str, period: str):
    bars = yahoo_service.get_history(symbol, period=period)
    if not bars:
        raise HTTPException(status_code=404, detail="No historical data found")
    
    df = pd.DataFrame([b.dict() for b in bars])
    return df

@router.get("/{symbol}/analysis", response_model=QuantAnalysis)
async def get_full_analysis(symbol: str, period: str = "3mo"):
    df = get_df(symbol, period)
    
    vap = calculate_vap(df)
    anomaly = detect_volume_anomaly(df)
    sr = calculate_support_resistance(df)
    
    indicators = {
        "MA": calculate_ma(df),
        "RSI": calculate_rsi(df),
        "KDJ": calculate_kdj(df),
        "BOLL": calculate_boll(df),
        "MACD": calculate_macd(df)
    }
    
    return QuantAnalysis(
        symbol=symbol,
        vap=vap,
        volume_anomaly=anomaly,
        support_resistance=sr,
        indicators=indicators
    )

@router.get("/{symbol}/vap", response_model=list[VAPResult])
async def get_vap(symbol: str, period: str = "3mo", bins: int = 12):
    df = get_df(symbol, period)
    return calculate_vap(df, bins)

@router.get("/{symbol}/scan", response_model=VolumeAnomalyResult)
async def scan_anomaly(symbol: str):
    df = get_df(symbol, "3mo")
    return detect_volume_anomaly(df)

@router.get("/scan/all")
async def scan_all():
    # In a real scenario, this would iterate through watchlist
    return {"message": "Not fully implemented. Requires watchlist fetching."}
