from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.schemas import AlertCreate, Alert
from app.core.deps import get_supabase
from datetime import datetime
import uuid

router = APIRouter()

@router.get("", response_model=List[Alert])
async def get_alerts(db=Depends(get_supabase)):
    res = db.table("alerts").select("*").execute()
    return [Alert(**a) for a in res.data]

@router.post("", response_model=Alert)
async def create_alert(alert: AlertCreate, db=Depends(get_supabase)):
    new_alert = {
        "id": str(uuid.uuid4()),
        "symbol": alert.symbol,
        "condition": alert.condition,
        "target_value": alert.target_value,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    res = db.table("alerts").insert(new_alert).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create alert")
    return Alert(**res.data[0])

@router.delete("/{id}")
async def delete_alert(id: str, db=Depends(get_supabase)):
    db.table("alerts").delete().eq("id", id).execute()
    return {"message": "Success"}

@router.put("/{id}/toggle", response_model=Alert)
async def toggle_alert(id: str, db=Depends(get_supabase)):
    res = db.table("alerts").select("is_active").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    current_status = res.data[0]['is_active']
    res = db.table("alerts").update({"is_active": not current_status}).eq("id", id).execute()
    return Alert(**res.data[0])
