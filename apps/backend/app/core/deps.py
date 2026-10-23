from fastapi import HTTPException

from app.core.db import Database, DatabaseNotConfigured, get_database


def get_db() -> Database:
    """FastAPI 依賴：取得資料庫連線；未設定 DATABASE_URL 時回 503 並說明原因"""
    try:
        return get_database()
    except DatabaseNotConfigured as e:
        raise HTTPException(status_code=503, detail=str(e))
