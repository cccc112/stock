from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import AIAnalysisRequest, AIAnalysisResponse
from app.services.gemini import gemini_service
from app.api.v1.quant import get_full_analysis
from app.core.deps import get_supabase
from datetime import datetime

router = APIRouter()

@router.get("/market-summary")
async def get_market_summary(db=Depends(get_supabase)):
    # Check cache table
    res = db.table("ai_cache").select("*").eq("type", "market_summary").order("created_at", desc=True).limit(1).execute()
    if res.data:
        return {"summary": res.data[0]['content'], "generated_at": res.data[0]['created_at']}
        
    # Generate new
    summary = await gemini_service.market_summary()
    return {"summary": summary, "generated_at": datetime.utcnow().isoformat()}

from fastapi import Header
from typing import Optional

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
    # Get watchlist symbols
    res = db.table("watchlist").select("symbol").execute()
    symbols = [r['symbol'] for r in (res.data or [])]
    if not symbols:
        symbols = ['2330.TW', '2454.TW', '2317.TW']  # defaults
    
    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")
    
    from app.services.ai_trader import ai_trader
    suggestions = await ai_trader.generate_suggestions(symbols[:5], api_key=api_key)
    return {"suggestions": suggestions}
