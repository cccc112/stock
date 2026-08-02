from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.schemas import WatchlistCreate, WatchlistItem, Watchlist, StockQuote
from app.core.deps import get_supabase
from datetime import datetime
import uuid
from app.api.v1.stocks import get_quote

router = APIRouter()

@router.get("", response_model=Watchlist)
async def get_watchlist(db=Depends(get_supabase)):
    res = db.table("watchlist").select("*").execute()
    items = [WatchlistItem(**item) for item in res.data]
    return Watchlist(items=items)

@router.post("/items", response_model=WatchlistItem)
async def add_watchlist_item(item: WatchlistCreate, db=Depends(get_supabase)):
    new_item = {
        "id": str(uuid.uuid4()),
        "symbol": item.symbol,
        "market": item.market.value,
        "created_at": datetime.utcnow().isoformat()
    }
    res = db.table("watchlist").insert(new_item).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to add item")
    return WatchlistItem(**res.data[0])

@router.delete("/items/{symbol}")
async def remove_watchlist_item(symbol: str, db=Depends(get_supabase)):
    db.table("watchlist").delete().eq("symbol", symbol).execute()
    return {"message": "Success"}

@router.get("/quotes", response_model=List[StockQuote])
async def get_watchlist_quotes(db=Depends(get_supabase)):
    res = db.table("watchlist").select("symbol").execute()
    symbols = [item["symbol"] for item in res.data]
    
    quotes = []
    for sym in symbols:
        try:
            q = await get_quote(sym)
            quotes.append(q)
        except:
            pass
    return quotes
