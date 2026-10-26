from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from app.core.deps import get_db
from app.models.schemas import QuantAnalysis, VAPResult, VolumeAnomalyResult, SupportResistanceLevel, QuantScreenRequest, BacktestRequest
from app.services import market_data
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
    """統一走 market_data (Yahoo -> FinMind 備援)"""
    return await market_data.get_df(symbol, period)

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
async def scan_all(db=Depends(get_db)):
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

STRATEGY_ALIASES = {
    "golden_death_cross": ["均線交叉", "golden_death_cross", "黃金交叉", "死亡交叉"],
    "ma_alignment": ["均線排列", "ma_alignment", "多頭排列", "空頭排列"],
    "macd_divergence": ["macd背離", "macd_divergence", "macd", "背離"],
    "bollinger_squeeze": ["布林擠壓", "bollinger_squeeze", "布林", "帶狀壓縮"],
    "kdj_cross": ["kdj交叉", "kdj_cross", "kd交叉", "kdj", "kd"],
    "volume_breakout": ["爆量突破", "volume_breakout", "量能爆發", "爆量"],
    "bottom_volume_breakout": ["底部爆量起漲", "bottom_volume_breakout", "底部爆量"],
    "volume_anomaly": ["量價異動", "volume_anomaly", "成交量異常"],
}

def _matches_strategy(sig_strategy: str, filter_tokens: List[str]) -> bool:
    if not filter_tokens or "all" in filter_tokens or "全部" in filter_tokens:
        return True
    sig_lower = sig_strategy.lower()
    for token in filter_tokens:
        tok_lower = token.lower()
        if tok_lower == sig_lower or tok_lower in sig_lower or sig_lower in tok_lower:
            return True
        for _, aliases in STRATEGY_ALIASES.items():
            if tok_lower in [a.lower() for a in aliases]:
                if any(a.lower() in sig_lower for a in aliases):
                    return True
    return False

@router.post("/screen")
async def screen_stocks(req: QuantScreenRequest, db=Depends(get_db)):
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
            
            # 若包含量價異動檢測
            if any(t in filter_strategies for t in ["volume_anomaly", "量價異動", "all", "全部"]):
                try:
                    anomaly = detect_volume_anomaly(df)
                    if anomaly and getattr(anomaly, "type", "NORMAL") != "NORMAL":
                        signals.append({
                            "strategy": "量價異動",
                            "direction": "BUY" if getattr(anomaly, "confidence", 0) >= 0.5 else "NEUTRAL",
                            "confidence": getattr(anomaly, "confidence", 0.6),
                            "description": getattr(anomaly, "description", f"偵測到 {anomaly.type} 異常量能")
                        })
                except Exception:
                    pass

            matched_signals = []
            for sig in signals:
                if _matches_strategy(sig['strategy'], filter_strategies):
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
