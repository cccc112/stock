from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.schemas import PortfolioHolding, PortfolioTransaction, PnLSummary, TransactionType
from app.core.deps import get_supabase
from app.api.v1.stocks import get_quote
import uuid
from datetime import datetime

router = APIRouter()

@router.get("/holdings", response_model=List[PortfolioHolding])
async def get_holdings(db=Depends(get_supabase)):
    res = db.table("portfolio_transactions").select("*").execute()
    
    holdings_dict = {}
    for t in res.data:
        sym = t['symbol']
        if sym not in holdings_dict:
            holdings_dict[sym] = {"shares": 0, "total_cost": 0, "market": t['market']}
            
        shares = float(t['shares'])
        price = float(t['price'])
        
        if t['type'] == TransactionType.BUY.value:
            holdings_dict[sym]['shares'] += shares
            holdings_dict[sym]['total_cost'] += shares * price
        elif t['type'] == TransactionType.SELL.value:
            sold_shares = float(t['shares'])
            if holdings_dict[sym]['shares'] > 0:
                avg = holdings_dict[sym]['total_cost'] / holdings_dict[sym]['shares']
                holdings_dict[sym]['total_cost'] -= avg * sold_shares
            holdings_dict[sym]['shares'] -= sold_shares
            
    holdings = []
    for sym, data in holdings_dict.items():
        if data['shares'] > 0:
            avg_price = data['total_cost'] / data['shares']
            try:
                quote = await get_quote(sym)
                current_price = quote.price
            except:
                current_price = avg_price
                
            pnl = (current_price - avg_price) * data['shares']
            pnl_pct = (current_price - avg_price) / avg_price * 100 if avg_price > 0 else 0
            
            holdings.append(PortfolioHolding(
                symbol=sym,
                shares=data['shares'],
                avg_price=avg_price,
                current_price=current_price,
                pnl=pnl,
                pnl_pct=pnl_pct,
                market=data['market']
            ))
            
    return holdings

@router.post("/transactions", response_model=PortfolioTransaction)
async def record_transaction(transaction: PortfolioTransaction, db=Depends(get_supabase)):
    data = transaction.dict()
    data['timestamp'] = data['timestamp'].isoformat()
    data['type'] = data['type'].value
    data['market'] = data['market'].value
    
    res = db.table("portfolio_transactions").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to record transaction")
    return PortfolioTransaction(**res.data[0])

@router.get("/transactions", response_model=List[PortfolioTransaction])
async def get_transactions(db=Depends(get_supabase)):
    res = db.table("portfolio_transactions").select("*").order("timestamp", desc=True).execute()
    return [PortfolioTransaction(**t) for t in res.data]

@router.get("/summary", response_model=PnLSummary)
async def get_summary(db=Depends(get_supabase)):
    holdings = await get_holdings(db)
    
    pnl_twd = sum(h.pnl for h in holdings if h.market == 'TW')
    pnl_usd = sum(h.pnl for h in holdings if h.market == 'US')
    
    return PnLSummary(total_pnl_twd=pnl_twd, total_pnl_usd=pnl_usd)

@router.delete("/holdings/{symbol}")
async def delete_holding(symbol: str, db=Depends(get_supabase)):
    res = db.table("portfolio_transactions").delete().eq("symbol", symbol).execute()
    return {"status": "success", "deleted_symbol": symbol}
