from fastapi import APIRouter, HTTPException, Depends
from app.core.deps import get_supabase
from app.models.schemas import QuantAnalysis, VAPResult, VolumeAnomalyResult, SupportResistanceLevel, QuantScreenRequest, BacktestRequest
from app.services.yahoo import yahoo_service
from app.quant.vap import calculate_vap
from app.quant.volume_anomaly import detect_volume_anomaly
from app.quant.support_resistance import calculate_support_resistance
from app.quant.indicators import calculate_ma, calculate_rsi, calculate_kdj, calculate_boll, calculate_macd
from app.quant.strategies import run_all_strategies
from app.quant.backtester import BacktestEngine
import pandas as pd
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

async def get_df(symbol: str, period: str = "3mo"):
    df = await fetch_backtest_df(symbol, period)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="No historical data found")
    return df


@router.get("/strategies/list")
async def get_strategy_list():
    """取得所有支援的量化研究策略清單與參數規格"""
    return BacktestEngine.get_supported_strategies()

async def fetch_backtest_df(symbol: str, period: str) -> Optional[pd.DataFrame]:
    clean_sym = symbol.replace('.TW', '').replace('.TWO', '')
    is_tw = symbol.endswith('.TW') or symbol.endswith('.TWO') or symbol.isnumeric()
    
    period_days_map = {
        "1mo": 30,
        "3mo": 90,
        "6mo": 180,
        "1y": 365,
        "2y": 730,
        "3y": 1095,
        "5y": 1825
    }
    days = period_days_map.get(period, 365)
    
    df = None
    if is_tw:
        try:
            from app.services.finmind import finmind_service
            raw_data = await finmind_service.get_history(clean_sym, days=days)
            if raw_data and len(raw_data) > 0:
                df = pd.DataFrame([{
                    'date': r['date'],
                    'open': r['open'],
                    'high': r['max'],
                    'low': r['min'],
                    'close': r['close'],
                    'volume': r['Trading_Volume']
                } for r in raw_data])
        except Exception as e:
            logger.warning(f"FinMind fetch error for {symbol}: {e}")
            
    if df is None or df.empty:
        try:
            bars = yahoo_service.get_history(symbol, period=period)
            if bars:
                df = pd.DataFrame([{
                    'date': b.time.strftime('%Y-%m-%d') if hasattr(b.time, 'strftime') else str(b.time)[:10],
                    'open': b.open,
                    'high': b.high,
                    'low': b.low,
                    'close': b.close,
                    'volume': b.volume
                } for b in bars])
        except Exception as e:
            logger.warning(f"Yahoo fetch error for {symbol}: {e}")

    return df

@router.post("/backtest")
async def run_backtest_endpoint(req: BacktestRequest):
    """執行策略回測與績效分析"""
    df = await fetch_backtest_df(req.symbol, req.period)
    if df is None or df.empty or len(df) < 5:
        raise HTTPException(status_code=400, detail=f"無法取得 {req.symbol} 的歷史交易數據，請檢查代碼或縮短回測區間")
        
    try:
        results = BacktestEngine.run_backtest(
            df=df,
            strategy_id=req.strategy_id,
            initial_capital=req.initial_capital,
            stop_loss_pct=req.stop_loss_pct,
            take_profit_pct=req.take_profit_pct,
            params=req.params
        )
        return {
            "symbol": req.symbol,
            "strategy_id": req.strategy_id,
            "period": req.period,
            **results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"回測執行失敗: {str(e)}")


@router.get("/{symbol}/analysis", response_model=QuantAnalysis)
async def get_full_analysis(symbol: str, period: str = "3mo"):
    df = await get_df(symbol, period)
    
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
    df = await get_df(symbol, period)
    return calculate_vap(df, bins)

@router.get("/{symbol}/scan", response_model=VolumeAnomalyResult)
async def scan_anomaly(symbol: str):
    df = await get_df(symbol, "3mo")
    return detect_volume_anomaly(df)

@router.get("/scan/all", response_model=list[VolumeAnomalyResult])
async def scan_all(db=Depends(get_supabase)):
    res = db.table("watchlist").select("symbol").execute()
    symbols = [r["symbol"] for r in res.data]
    
    results = []
    for sym in symbols:
        try:
            df = await get_df(sym, "3mo")
            anomaly = detect_volume_anomaly(df)
            if anomaly.type.value != "NORMAL":
                results.append(anomaly)
        except Exception:
            continue
            
    return results

@router.post("/screen")
async def screen_stocks(req: QuantScreenRequest, db=Depends(get_supabase)):
    """Screen stocks by strategy. strategies is comma-separated list."""
    if req.symbols and len(req.symbols) > 0:
        symbols = req.symbols
    else:
        res = db.table("watchlist").select("symbol").execute()
        symbols = [r["symbol"] for r in (res.data or [])]
        if not symbols:
            symbols = ['2330.TW', '2454.TW', '2317.TW'] # defaults
        
    filter_strategies = [s.strip().lower() for s in req.strategies.split(",") if s.strip()]
    
    results = []
    for sym in symbols:
        try:
            df = await get_df(sym, "3mo")
            signals = run_all_strategies(df, req.params)
            
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
