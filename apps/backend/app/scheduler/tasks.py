from app.core.deps import get_supabase
from app.api.v1.stocks import get_quote
from app.services.gemini import gemini_service
from app.services.finmind import finmind_service
from datetime import datetime
import uuid

async def scan_alerts():
    db = next(get_supabase())
    res = db.table("alerts").select("*").eq("is_active", True).execute()
    
    for alert in res.data:
        try:
            if alert['condition'] == 'VOLUME_ANOMALY':
                from app.api.v1.quant import scan_anomaly
                result = await scan_anomaly(alert['symbol'])
                
                if result.type.value != "NORMAL":
                    print(f"Alert triggered for {alert['symbol']}! Volume anomaly detected: {result.type.value}")
                    db.table("alerts").update({"is_active": False}).eq("id", alert['id']).execute()
        except Exception as e:
            print(f"Error processing alert {alert['id']}: {e}")

async def scan_volume_anomalies():
    db = next(get_supabase())
    res = db.table("watchlist").select("symbol").execute()
    symbols = [item['symbol'] for item in res.data]
    
    for sym in symbols:
        try:
            from app.api.v1.quant import scan_anomaly
            result = await scan_anomaly(sym)
            if result.type.value != "NORMAL":
                print(f"Volume anomaly detected for {sym}: {result.type.value}")
        except Exception as e:
            print(f"Error scanning anomaly for {sym}: {e}")

async def update_market_summary():
    try:
        summary = await gemini_service.market_summary()
        
        db = next(get_supabase())
        new_entry = {
            "id": str(uuid.uuid4()),
            "type": "market_summary",
            "content": summary,
            "created_at": datetime.utcnow().isoformat()
        }
        db.table("ai_cache").insert(new_entry).execute()
        print("Market summary updated.")
    except Exception as e:
        print(f"Error updating market summary: {e}")

async def execute_ai_trades():
    db = next(get_supabase())
    # Query portfolios with is_ai_auto_trade=True
    portfolios_res = db.table("sim_portfolios").select("*").eq("is_ai_auto_trade", True).execute()
    portfolios = portfolios_res.data
    
    if not portfolios:
        return

    # Get watchlist symbols as target universe
    watchlist_res = db.table("watchlist").select("symbol").execute()
    symbols = [item['symbol'] for item in watchlist_res.data]
    
    if not symbols:
        return
        
    for p in portfolios:
        portfolio_id = p['id']
        cash = float(p['cash_balance'])
        
        # Simple logic: query AI for each symbol to get a trade signal
        for sym in symbols:
            try:
                quote = await get_quote(sym)
                decision = await gemini_service.auto_trade_decision(sym, quote.dict())
                decision = decision.strip().upper()
                
                # Check current holdings for sell decision
                holdings_res = db.table("sim_transactions").select("*").eq("portfolio_id", portfolio_id).eq("symbol", sym).execute()
                shares_held = sum(tx['shares'] if tx['type'] == 'BUY' else -tx['shares'] for tx in holdings_res.data)
                
                trade_qty = 1000  # Default 1000 shares
                total_cost = quote.price * trade_qty
                
                if "BUY" in decision and cash >= total_cost:
                    # Execute Buy
                    new_cash = cash - total_cost
                    db.table("sim_portfolios").update({"cash_balance": new_cash}).eq("id", portfolio_id).execute()
                    cash = new_cash
                    
                    tx = {
                        "id": str(uuid.uuid4()),
                        "portfolio_id": portfolio_id,
                        "symbol": sym,
                        "type": "BUY",
                        "price": quote.price,
                        "shares": trade_qty,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    db.table("sim_transactions").insert(tx).execute()
                    print(f"AI Auto Trade: BUY {trade_qty} shares of {sym} for portfolio {portfolio_id}")
                    
                elif "SELL" in decision and shares_held >= trade_qty:
                    # Execute Sell
                    new_cash = cash + total_cost
                    db.table("sim_portfolios").update({"cash_balance": new_cash}).eq("id", portfolio_id).execute()
                    cash = new_cash
                    
                    tx = {
                        "id": str(uuid.uuid4()),
                        "portfolio_id": portfolio_id,
                        "symbol": sym,
                        "type": "SELL",
                        "price": quote.price,
                        "shares": trade_qty,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    db.table("sim_transactions").insert(tx).execute()
                    print(f"AI Auto Trade: SELL {trade_qty} shares of {sym} for portfolio {portfolio_id}")
            except Exception as e:
                print(f"AI auto trade error for {sym}: {e}")

async def sync_market_symbols():
    try:
        db = next(get_supabase())
        info_data = await finmind_service.get_stock_info()
        if not info_data:
            return
            
        for item in info_data:
            symbol = item.get("stock_id")
            name = item.get("stock_name")
            listing_date = item.get("date")
            type_val = "ETF" if "ETF" in item.get("industry_category", "").upper() else "STOCK"
            # FinMind provides mainly TW stocks
            market = "TW"
            
            if symbol and name:
                upsert_data = {
                    "symbol": symbol,
                    "name": name,
                    "market": market,
                    "type": type_val,
                    "listing_date": listing_date if listing_date else None
                }
                db.table("market_symbols").upsert(upsert_data).execute()
        print("Market symbols synced successfully.")
    except Exception as e:
        print(f"Error syncing market symbols: {e}")
