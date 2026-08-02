from app.core.deps import get_supabase
from app.api.v1.stocks import get_quote
from app.services.gemini import gemini_service
from datetime import datetime
import uuid

async def scan_alerts():
    db = next(get_supabase())
    res = db.table("alerts").select("*").eq("is_active", True).execute()
    
    for alert in res.data:
        try:
            quote = await get_quote(alert['symbol'])
            
            # Simple eval for condition e.g., ">", "<"
            condition_met = False
            if alert['condition'] == '>' and quote.price > alert['target_value']:
                condition_met = True
            elif alert['condition'] == '<' and quote.price < alert['target_value']:
                condition_met = True
                
            if condition_met:
                # Trigger notification (in real app, send push/email)
                print(f"Alert triggered for {alert['symbol']}! Price {quote.price} {alert['condition']} {alert['target_value']}")
                
                # Deactivate alert after triggering
                db.table("alerts").update({"is_active": False}).eq("id", alert['id']).execute()
        except Exception as e:
            print(f"Error processing alert {alert['id']}: {e}")

async def scan_volume_anomalies():
    # Fetch watchlist
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
