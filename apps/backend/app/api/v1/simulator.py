import asyncio
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from app.core.deps import get_db
from app.models.schemas import SimPortfolio, SimPortfolioCreate, SimTradeRequest, SimTransaction
from app.services import market_data
from app.services.gemini import gemini_service

router = APIRouter()


def _positions(txs: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
    """由交易紀錄推算各檔持股：shares 與平均成本（賣出按平均成本沖銷）"""
    pos: Dict[str, Dict[str, float]] = {}
    for t in sorted(txs, key=lambda x: x["timestamp"]):
        p = pos.setdefault(t["symbol"], {"shares": 0.0, "cost": 0.0})
        shares, price = float(t["shares"]), float(t["price"])
        if t["type"] == "BUY":
            p["shares"] += shares
            p["cost"] += shares * price
        elif p["shares"] > 0:
            avg = p["cost"] / p["shares"]
            sold = min(shares, p["shares"])
            p["cost"] -= avg * sold
            p["shares"] -= sold
    return {s: v for s, v in pos.items() if v["shares"] > 1e-9}


async def _portfolio_view(db, row: Dict[str, Any]) -> Dict[str, Any]:
    """前端「模擬帳戶概況 / 模擬庫存」需要的完整組合資訊（現金、持股市值、損益、持股明細）"""
    txs = db.table("sim_transactions").select("*").eq("portfolio_id", row["id"]).execute().data
    pos = _positions(txs)
    symbols = list(pos)
    quotes = await asyncio.gather(*[market_data.get_quote(s) for s in symbols], return_exceptions=True)
    holdings, holdings_value = [], 0.0
    for sym, q in zip(symbols, quotes):
        shares, avg = pos[sym]["shares"], pos[sym]["cost"] / pos[sym]["shares"]
        price = q.price if q is not None and not isinstance(q, Exception) else avg
        holdings_value += price * shares
        holdings.append({"symbol": sym, "shares": shares, "avg_price": avg, "current_price": price,
                         "pnl": (price - avg) * shares})
    cash = float(row["cash_balance"])
    # 現金只會因交易而變動，故初始資金 = 目前現金 + 買進總額 − 賣出總額
    invested = sum(float(t["shares"]) * float(t["price"]) * (1 if t["type"] == "BUY" else -1) for t in txs)
    initial = cash + invested
    pnl = cash + holdings_value - initial
    return {
        "id": row["id"], "name": row["name"], "created_at": row["created_at"],
        "cash": cash, "cash_balance": cash, "initial_capital": initial,
        "holdings_value": holdings_value, "pnl": pnl,
        "pnl_pct": (pnl / initial * 100) if initial else 0.0,
        "is_ai_auto_trade": bool(row.get("is_ai_auto_trade")),
        "holdings": holdings,
    }


@router.get("/portfolios")
async def get_portfolios(db=Depends(get_db)):
    rows = db.table("sim_portfolios").select("*").order("created_at", desc=False).execute().data
    return [await _portfolio_view(db, r) for r in rows]


@router.post("/portfolios")
async def create_portfolio(body: SimPortfolioCreate, db=Depends(get_db)):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="請輸入投資組合名稱")
    if body.initial_cash <= 0:
        raise HTTPException(status_code=400, detail="初始資金必須大於 0")
    res = db.table("sim_portfolios").insert({
        "id": str(uuid.uuid4()), "name": body.name.strip(), "cash_balance": body.initial_cash,
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
    return await _portfolio_view(db, res.data[0])


async def _do_trade(db, portfolio_id: str, req: SimTradeRequest) -> SimTransaction:
    side = req.type or req.action
    if side is None:
        raise HTTPException(status_code=400, detail="請指定買進或賣出")
    side_v = side.value
    if req.shares <= 0:
        raise HTTPException(status_code=400, detail="數量必須大於 0")

    res = db.table("sim_portfolios").select("*").eq("id", portfolio_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    cash = float(res.data[0]["cash_balance"])

    price = req.price
    if not price:  # 價格留空 = 以市價成交
        quote = await market_data.get_quote(req.symbol)
        if not quote:
            raise HTTPException(status_code=400, detail=f"無法取得 {req.symbol} 的市價，請手動輸入價格")
        price = quote.price
    total = price * req.shares

    if side_v == "BUY":
        if cash < total:
            raise HTTPException(status_code=400, detail="Insufficient funds（可用資金不足）")
    else:
        held_rows = db.table("sim_transactions").select("*").eq("portfolio_id", portfolio_id) \
            .eq("symbol", req.symbol).execute().data
        held = _positions(held_rows).get(req.symbol, {"shares": 0.0})["shares"]
        if held + 1e-9 < req.shares:
            raise HTTPException(status_code=400, detail=f"持股不足：目前持有 {held:g}，欲賣出 {req.shares:g}")

    db.table("sim_portfolios").update({"cash_balance": cash - total if side_v == "BUY" else cash + total}) \
        .eq("id", portfolio_id).execute()
    res_tx = db.table("sim_transactions").insert({
        "id": str(uuid.uuid4()), "portfolio_id": portfolio_id, "symbol": req.symbol, "type": side_v,
        "price": price, "shares": req.shares, "reason": req.reason,
        "timestamp": datetime.utcnow().isoformat(),
    }).execute()
    return SimTransaction(**res_tx.data[0])


@router.post("/trade", response_model=SimTransaction)
async def execute_trade_body(req: SimTradeRequest, db=Depends(get_db)):
    """前端使用：portfolio_id 放在內容裡"""
    if not req.portfolio_id:
        raise HTTPException(status_code=400, detail="缺少 portfolio_id")
    return await _do_trade(db, req.portfolio_id, req)


@router.post("/{portfolio_id}/trade", response_model=SimTransaction)
async def execute_trade(portfolio_id: str, req: SimTradeRequest, db=Depends(get_db)):
    return await _do_trade(db, portfolio_id, req)


@router.get("/{portfolio_id}/transactions", response_model=List[SimTransaction])
async def get_transactions(portfolio_id: str, db=Depends(get_db)):
    res = db.table("sim_transactions").select("*").eq("portfolio_id", portfolio_id).order("timestamp", desc=True).execute()
    return [SimTransaction(**t) for t in res.data]


@router.get("/{portfolio_id}/performance")
async def get_performance(portfolio_id: str, db=Depends(get_db)):
    res = db.table("sim_transactions").select("*").eq("portfolio_id", portfolio_id).execute()
    txs = res.data

    wins = 0
    total_trades = 0
    realized_pnl = 0.0

    for sym in set(t["symbol"] for t in txs):
        shares, cost = 0.0, 0.0
        for t in sorted((x for x in txs if x["symbol"] == sym), key=lambda x: x["timestamp"]):
            if t["type"] == "BUY":
                shares += t["shares"]
                cost += t["shares"] * t["price"]
            elif shares > 0:
                avg = cost / shares
                profit = (t["price"] - avg) * t["shares"]
                realized_pnl += profit
                cost -= avg * t["shares"]
                shares -= t["shares"]
                total_trades += 1
                if profit > 0:
                    wins += 1

    return {
        "total_return": realized_pnl,
        "win_rate": (wins / total_trades * 100) if total_trades > 0 else 0,
        "max_drawdown": 0.0,
    }


@router.post("/{portfolio_id}/review")
async def request_review(portfolio_id: str, db=Depends(get_db), authorization: Optional[str] = Header(None)):
    port_res = db.table("sim_portfolios").select("*").eq("id", portfolio_id).execute()
    if not port_res.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    tx_res = db.table("sim_transactions").select("*").eq("portfolio_id", portfolio_id).execute()
    if not tx_res.data:
        raise HTTPException(status_code=400, detail="這個組合還沒有任何交易，無法覆盤")

    api_key = authorization.replace("Bearer ", "") if authorization and authorization.startswith("Bearer ") else None
    try:
        review_text = await gemini_service.review_trades(tx_res.data, port_res.data[0], api_key=api_key)
    except ValueError as e:  # 沒有 API Key
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 覆盤失敗: {e}")
    return {"message": "Review completed", "review": review_text}


@router.put("/{portfolio_id}/toggle_ai", response_model=SimPortfolio)
async def toggle_ai_auto_trade(portfolio_id: str, db=Depends(get_db)):
    res = db.table("sim_portfolios").select("is_ai_auto_trade").eq("id", portfolio_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    current_status = res.data[0].get("is_ai_auto_trade", False)
    res = db.table("sim_portfolios").update({"is_ai_auto_trade": not current_status}).eq("id", portfolio_id).execute()
    return SimPortfolio(**res.data[0])
