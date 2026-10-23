from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.models.schemas import AIAnalysisRequest, AIAnalysisResponse
from app.services.gemini import gemini_service
from app.api.v1.quant import get_full_analysis
from app.core.deps import get_db
from datetime import datetime

router = APIRouter()

@router.get("/market-summary")
async def get_market_summary(refresh: bool = False, authorization: Optional[str] = Header(None)):
    # 全域共用快取 1 小時（原本讀 Supabase 最新一筆且不檢查時間，會永遠回傳舊資料）
    from app.services.cache import cache_service
    import json as _json
    cache_key = "ai:market_summary"
    if not refresh:
        cached = await cache_service.get(cache_key)
        if cached:
            try:
                return _json.loads(cached)
            except Exception:
                pass

    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")
    
    try:
        # Generate new
        from app.services import market_data
        idx = {}
        for name, sym in {"台股加權": "^TWII", "S&P500": "^GSPC", "那斯達克": "^IXIC", "費半": "^SOX", "VIX": "^VIX"}.items():
            q = await market_data.get_quote(sym)
            if q:
                idx[name] = {"price": round(q.price, 2), "change_pct": round(q.change_pct, 2), "stale": q.stale}
        summary = await gemini_service.market_summary(api_key=api_key, context={"indices": idx})
        result = {"summary": summary, "generated_at": datetime.utcnow().isoformat()}
        await cache_service.set(cache_key, _json.dumps(result, ensure_ascii=False), ttl=3600)
        return result
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
        
        from app.services import market_data
        history = await market_data.get_history(symbol, period=period)
        kline_summary = []
        for b in history[-5:]:
            row = b.model_dump()
            row['time'] = row['time'].isoformat()
            kline_summary.append(row)

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
async def review_trades(portfolio_id: str, db=Depends(get_db)):
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
async def get_trade_suggestions(db=Depends(get_db), authorization: Optional[str] = Header(None)):
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
        
    from app.services import market_data
    from app.services.finmind import finmind_service
    history_data = await market_data.get_history(symbol, '6mo', '1d')

    if not history_data or len(history_data) < 20:
        raise HTTPException(status_code=400, detail="歷史資料不足，無法計算支撐與壓力")
        
    # 計算支撐與壓力
    recent_20 = history_data[-20:]
    recent_60 = history_data[-60:]
    
    price_now = history_data[-1].close
    supports = sorted({round(min(b.low for b in recent_20), 2), round(min(b.low for b in recent_60), 2)}, reverse=True)
    resistances = sorted({round(max(b.high for b in recent_20), 2), round(max(b.high for b in recent_60), 2)})
    # 只保留位置合理的線：支撐在現價下方、壓力在現價上方
    supports = [x for x in supports if x <= price_now] or supports
    resistances = [x for x in resistances if x >= price_now] or resistances
    
    # 2. 取得基本面資料
    clean_sym = market_data.split_symbol(symbol)[0]
    fundamentals = {}
    if market_data.split_symbol(symbol)[1] == "TW":
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
            
    # 3. 呼叫 Gemini 進行分析（失敗時仍回傳計算好的支撐壓力線）
    analysis, analysis_error = None, None
    try:
        analysis = await gemini_service.chart_fundamental_analysis(
            symbol=symbol,
            supports=supports,
            resistances=resistances,
            fundamentals=fundamentals,
            api_key=api_key
        )
    except Exception as e:
        analysis_error = str(e)

    return {
        "supportLines": supports,
        "resistanceLines": resistances,
        "analysis": analysis,
        "analysis_error": analysis_error,
    }

@router.post("/committee/{symbol}")
async def run_ai_committee(symbol: str, authorization: Optional[str] = Header(None)):
    """召開 AI 投資委員會 (巴菲特、西蒙斯、風控長多角色辯論與 CIO 裁決)"""
    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")
        
    try:
        from app.services.multi_agent import multi_agent_service
        result = await multi_agent_service.run_committee(symbol=symbol, api_key=api_key)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 投資委員會分析失敗: {str(e)}")

