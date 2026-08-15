from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.schemas import SimPortfolio, SimTransaction, SimTradeRequest
from app.core.deps import get_supabase
from datetime import datetime
import uuid
import httpx
from app.services.gemini import gemini_service

router = APIRouter()

@router.get("/portfolios", response_model=List[SimPortfolio])
async def get_portfolios(db=Depends(get_supabase)):
    res = db.table("sim_portfolios").select("*").execute()
    return [SimPortfolio(**p) for p in res.data]

@router.post("/portfolios", response_model=SimPortfolio)
async def create_portfolio(name: str, initial_cash: float = 100000.0, db=Depends(get_supabase)):
    new_portfolio = {
        "id": str(uuid.uuid4()),
        "name": name,
        "cash_balance": initial_cash,
        "created_at": datetime.utcnow().isoformat()
    }
    res = db.table("sim_portfolios").insert(new_portfolio).execute()
    return SimPortfolio(**res.data[0])

@router.post("/{portfolio_id}/trade", response_model=SimTransaction)
async def execute_trade(portfolio_id: str, req: SimTradeRequest, db=Depends(get_supabase)):
    res = db.table("sim_portfolios").select("cash_balance").eq("id", portfolio_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    cash = float(res.data[0]['cash_balance'])
    total_cost = req.price * req.shares
    
    if req.type.value == "BUY" and cash < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient funds")
        
    new_cash = cash - total_cost if req.type.value == "BUY" else cash + total_cost
    
    db.table("sim_portfolios").update({"cash_balance": new_cash}).eq("id", portfolio_id).execute()
    
    new_tx = {
        "id": str(uuid.uuid4()),
        "portfolio_id": portfolio_id,
        "symbol": req.symbol,
        "type": req.type.value,
        "price": req.price,
        "shares": req.shares,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    res_tx = db.table("sim_transactions").insert(new_tx).execute()
    return SimTransaction(**res_tx.data[0])

@router.get("/{portfolio_id}/transactions", response_model=List[SimTransaction])
async def get_transactions(portfolio_id: str, db=Depends(get_supabase)):
    res = db.table("sim_transactions").select("*").eq("portfolio_id", portfolio_id).order("timestamp", desc=True).execute()
    return [SimTransaction(**t) for t in res.data]

@router.get("/{portfolio_id}/performance")
async def get_performance(portfolio_id: str, db=Depends(get_supabase)):
    res = db.table("sim_transactions").select("*").eq("portfolio_id", portfolio_id).execute()
    txs = res.data
    
    wins = 0
    total_trades = 0
    realized_pnl = 0.0
    
    symbols = set(t['symbol'] for t in txs)
    for sym in symbols:
        sym_txs = sorted([t for t in txs if t['symbol'] == sym], key=lambda x: x['timestamp'])
        shares = 0
        cost = 0.0
        for t in sym_txs:
            if t['type'] == 'BUY':
                shares += t['shares']
                cost += t['shares'] * t['price']
            elif t['type'] == 'SELL':
                if shares > 0:
                    avg = cost / shares
                    profit = (t['price'] - avg) * t['shares']
                    realized_pnl += profit
                    cost -= avg * t['shares']
                    shares -= t['shares']
                    total_trades += 1
                    if profit > 0:
                        wins += 1
                        
    return {
        "total_return": realized_pnl,
        "win_rate": (wins / total_trades * 100) if total_trades > 0 else 0,
        "max_drawdown": 0.0
    }

@router.post("/{portfolio_id}/review")
async def request_review(portfolio_id: str, db=Depends(get_supabase)):
    port_res = db.table("sim_portfolios").select("*").eq("id", portfolio_id).execute()
    if not port_res.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    tx_res = db.table("sim_transactions").select("*").eq("portfolio_id", portfolio_id).execute()
    
    review_text = await gemini_service.review_trades(tx_res.data, port_res.data[0])
    return {"message": "Review completed", "review": review_text}

@router.put("/{portfolio_id}/toggle_ai", response_model=SimPortfolio)
async def toggle_ai_auto_trade(portfolio_id: str, db=Depends(get_supabase)):
    res = db.table("sim_portfolios").select("is_ai_auto_trade").eq("id", portfolio_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
        
    current_status = res.data[0].get('is_ai_auto_trade', False)
    res = db.table("sim_portfolios").update({"is_ai_auto_trade": not current_status}).eq("id", portfolio_id).execute()
    return SimPortfolio(**res.data[0])
