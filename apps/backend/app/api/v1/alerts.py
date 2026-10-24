import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_db
from app.models.schemas import AlertCreate, AlertToggle

logger = logging.getLogger(__name__)
router = APIRouter()


def _view(a: Dict[str, Any]) -> Dict[str, Any]:
    """整理成前端「智慧警報」頁需要的欄位（status: active / inactive）"""
    created = a["created_at"]
    return {
        "id": a["id"], "symbol": a["symbol"], "condition": a["condition"], "value": a.get("value") or "",
        "message": a.get("message") or f'{a["condition"]} {a.get("value") or ""}'.strip(),
        "type": "info", "is_active": a["is_active"],
        "status": "active" if a["is_active"] else "inactive",
        "created_at": created, "createdAt": created,
    }


@router.get("")
async def get_alerts() -> List[Dict[str, Any]]:
    try:
        from app.core.db import get_database
        rows = get_database().table("alerts").select("*").order("created_at", desc=True).execute().data
        return [_view(a) for a in rows]
    except Exception as e:  # 沒有資料庫時儀表板仍要能顯示
        logger.warning("Failed to load alerts: %s", e)
        return []


@router.post("")
async def create_alert(alert: AlertCreate, db=Depends(get_db)):
    if not alert.symbol.strip() or not alert.condition.strip():
        raise HTTPException(status_code=400, detail="請填寫股票代號與條件")
    res = db.table("alerts").insert({
        "id": str(uuid.uuid4()),
        "symbol": alert.symbol.strip().upper(),
        "condition": alert.condition.strip(),
        "value": alert.value,
        "message": alert.message,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create alert")
    return _view(res.data[0])


@router.delete("/{id}")
async def delete_alert(id: str, db=Depends(get_db)):
    db.table("alerts").delete().eq("id", id).execute()
    return {"message": "Success"}


@router.patch("/{id}")
async def set_alert_active(id: str, body: AlertToggle, db=Depends(get_db)):
    """前端開關：明確指定啟用/停用"""
    res = db.table("alerts").update({"is_active": body.active}).eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _view(res.data[0])


@router.put("/{id}/toggle")
async def toggle_alert(id: str, db=Depends(get_db)):
    res = db.table("alerts").select("is_active").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    res = db.table("alerts").update({"is_active": not res.data[0]["is_active"]}).eq("id", id).execute()
    return _view(res.data[0])
