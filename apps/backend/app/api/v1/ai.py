from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.models.schemas import AIAnalysisRequest, AIAnalysisResponse
from app.services.gemini import gemini_service
from app.api.v1.quant import get_full_analysis
from app.core.deps import get_supabase
from datetime import datetime

router = APIRouter()

@router.get("/market-summary")
async def get_market_summary(authorization: Optional[str] = Header(None)):
    # Check cache table (optional, don't crash if Supabase unavailable)
    try:
        db = get_supabase()
        res = db.table("ai_cache").select("*").eq("type", "market_summary").order("created_at", desc=True).limit(1).execute()
        if res.data:
            return {"summary": res.data[0]['content'], "generated_at": res.data[0]['created_at']}
    except Exception as e:
        print(f"Supabase cache unavailable: {e}")
    
    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")
    
    try:
        # Generate new
        summary = await gemini_service.market_summary(api_key=api_key)
        return {"summary": summary, "generated_at": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 盤勢診斷失敗: {str(e)}")


@router.post("/analyze/{symbol}", response_model=AIAnalysisResponse)
async def analyze_stock(symbol: str, req: AIAnalysisRequest = None, authorization: Optional[str] = Header(None)):
    try:
        period = req.period if req else "3mo"
        api_key = None
        if req and req.api_key:
            api_key = req.api_key
        elif authorization and authorization.startswith("Bearer "):
            api_key = authorization.replace("Bearer ", "")

        quant_data = await get_full_analysis(symbol, period)
        
        # Get recent kline summary
        from app.services.yahoo import yahoo_service
        history = yahoo_service.get_history(symbol, period=period)
        kline_summary = []
        if history is not None and len(history) > 0:
            recent = history[-5:]
            kline_summary = [b.dict() for b in recent]
            # convert timestamps to strings for JSON serializability
            for row in kline_summary:
                if 'time' in row:
                    row['time'] = row['time'].isoformat()
        
        analysis = await gemini_service.analyze_stock(
            symbol=symbol,
            kline_data=kline_summary,
            indicators=quant_data.indicators,
            vap=[v.dict() for v in quant_data.vap],
            api_key=api_key
        )
        
        return AIAnalysisResponse(
            symbol=symbol,
            analysis=analysis,
            generated_at=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/review/{portfolio_id}")
async def review_trades(portfolio_id: str, db=Depends(get_supabase)):
    res_t = db.table("sim_transactions").select("*").eq("portfolio_id", portfolio_id).execute()
    res_p = db.table("sim_portfolios").select("*").eq("id", portfolio_id).execute()
    
    if not res_p.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    review = await gemini_service.review_trades(
        transactions=res_t.data,
        portfolio=res_p.data[0]
    )
    
    return {"review": review}

@router.get("/trade-suggestions")
async def get_trade_suggestions(db=Depends(get_supabase), authorization: Optional[str] = Header(None)):
    # Check cache first to prevent slow Gemini calls on every dashboard load
    import json
    from app.services.cache import cache_service
    cache_key = "ai:trade_suggestions"
    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return {"suggestions": json.loads(cached)}
        except Exception:
            pass

    # Get watchlist symbols
    try:
        res = db.table("watchlist").select("symbol").execute()
        symbols = [r['symbol'] for r in (res.data or [])]
    except Exception:
        symbols = []
        
    if not symbols:
        symbols = ['2330.TW', '2454.TW', '2317.TW']  # defaults
    
    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")
    
    try:
        from app.services.ai_trader import ai_trader
        suggestions = await ai_trader.generate_suggestions(symbols[:3], api_key=api_key)
        
        # Cache the suggestions for 1 hour
        if suggestions:
            try:
                await cache_service.set(cache_key, json.dumps(suggestions), ttl=3600)
            except Exception:
                pass
                
        return {"suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 交易建議產生失敗: {str(e)}")

@router.post("/chart-analysis/{symbol}")
async def chart_analysis(symbol: str, authorization: Optional[str] = Header(None)):
    """自動計算支撐壓力並結合基本面由 AI 給出操作建議"""
    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")
        
    # 1. 取得歷史 K 線計算支撐與壓力 (抓取 TWSE 或 Yahoo，這裡可以借用 ai_trader 抓歷史的邏輯)
    from app.services.yahoo import yahoo_service
    from app.services.finmind import finmind_service
    import asyncio
    loop = asyncio.get_event_loop()
    
    history_data = None
    try:
        history_data = await asyncio.wait_for(
            loop.run_in_executor(None, yahoo_service.get_history, symbol, '3mo', '1d'),
            timeout=4.0
        )
    except Exception:
        pass
        
    if not history_data and (symbol.endswith('.TW') or symbol.isnumeric()):
        clean_sym = symbol.replace('.TW', '')
        fm_data = await finmind_service.get_history(clean_sym, days=90)
        if fm_data:
            import pandas as pd
            history_data = []
            for row in fm_data:
                history_data.append(type('obj', (object,), {
                    'low': row.get("min", 0),
                    'high': row.get("max", 0)
                }))

    if not history_data or len(history_data) < 20:
        raise HTTPException(status_code=400, detail="歷史資料不足，無法計算支撐與壓力")
        
    # 計算支撐與壓力
    recent_20 = history_data[-20:]
    recent_60 = history_data[-60:]
    
    supports = list(set([min([b.low for b in recent_20]), min([b.low for b in recent_60])]))
    resistances = list(set([max([b.high for b in recent_20]), max([b.high for b in recent_60])]))
    
    # 2. 取得基本面資料
    clean_sym = symbol.replace('.TW', '')
    fundamentals = {}
    if symbol.endswith('.TW') or symbol.isnumeric():
        try:
            rev_data = await finmind_service.get_monthly_revenue(clean_sym, months=3)
            if rev_data:
                fundamentals["recent_revenue"] = rev_data
            
            inst_data = await finmind_service.get_institutional_investors(clean_sym, days=7)
            if inst_data:
                # 只取最後一天的資料縮減 Token
                dates = set(r['date'] for r in inst_data)
                latest_date = max(dates)
                latest_data = [r for r in inst_data if r['date'] == latest_date]
                fundamentals["latest_institutional_flow"] = latest_data
        except Exception:
            pass
            
    # 3. 呼叫 Gemini 進行分析
    try:
        analysis = await gemini_service.chart_fundamental_analysis(
            symbol=symbol,
            supports=supports,
            resistances=resistances,
            fundamentals=fundamentals,
            api_key=api_key
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {
        "supportLines": supports,
        "resistanceLines": resistances,
        "analysis": analysis
    }
