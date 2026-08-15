from fastapi import APIRouter, HTTPException, Depends
from app.core.deps import get_supabase
from app.models.schemas import QuantAnalysis, VAPResult, VolumeAnomalyResult, SupportResistanceLevel
from app.services.yahoo import yahoo_service
from app.quant.vap import calculate_vap
from app.quant.volume_anomaly import detect_volume_anomaly
from app.quant.support_resistance import calculate_support_resistance
from app.quant.indicators import calculate_ma, calculate_rsi, calculate_kdj, calculate_boll, calculate_macd
from app.quant.strategies import run_all_strategies
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
    
    strategies = run_all_strategies(df)
    
    return QuantAnalysis(
        symbol=symbol,
        vap=vap,
        volume_anomaly=anomaly,
        support_resistance=sr,
        indicators=indicators,
        strategies=strategies
    )

@router.get("/{symbol}/vap", response_model=list[VAPResult])
async def get_vap(symbol: str, period: str = "3mo", bins: int = 12):
    df = get_df(symbol, period)
    return calculate_vap(df, bins)

@router.get("/{symbol}/scan", response_model=VolumeAnomalyResult)
async def scan_anomaly(symbol: str):
    df = get_df(symbol, "3mo")
    return detect_volume_anomaly(df)

@router.get("/scan/all", response_model=list[VolumeAnomalyResult])
async def scan_all(db=Depends(get_supabase)):
    res = db.table("watchlist").select("symbol").execute()
    symbols = [r["symbol"] for r in res.data]
    
    results = []
    for sym in symbols:
        try:
            df = get_df(sym, "3mo")
            anomaly = detect_volume_anomaly(df)
            if anomaly.type.value != "NORMAL":
                results.append(anomaly)
        except Exception:
            continue
            
    return results

@router.get("/screen")
async def screen_stocks(strategies: str = "", db=Depends(get_supabase)):
    """Screen stocks by strategy. strategies is comma-separated list."""
    res = db.table("watchlist").select("symbol").execute()
    symbols = [r["symbol"] for r in (res.data or [])]
    if not symbols:
        symbols = ['2330.TW', '2454.TW', '2317.TW'] # defaults
        
    filter_strategies = [s.strip().lower() for s in strategies.split(",") if s.strip()]
    
    results = []
    for sym in symbols:
        try:
            # We need raw dataframe for yahoo_service history
            bars = yahoo_service.get_history(sym, period="3mo")
            if not bars:
                continue
            df = pd.DataFrame([b.dict() if hasattr(b, 'dict') else b for b in bars])
            
            signals = run_all_strategies(df)
            
            matched_signals = []
            for sig in signals:
                if not filter_strategies or sig['strategy'].lower() in filter_strategies:
                    matched_signals.append(sig)
                    
            if matched_signals:
                results.append({
                    "symbol": sym,
                    "signals": matched_signals
                })
        except Exception as e:
            print(f"Error screening {sym}: {e}")
            continue
            
    return {"results": results}
