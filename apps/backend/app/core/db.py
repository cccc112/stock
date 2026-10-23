"""
Postgres (Neon) 資料層

提供與 supabase-py 相同的鏈式介面 (db.table("x").select("*").eq("id", 1).execute().data)，
讓既有 API 程式碼不必改寫；底層改為 psycopg 直接連 Postgres。
所有值皆以參數綁定，表名/欄名經白名單驗證後才以引號組入 SQL，避免 SQL injection。
"""
import logging
import re
import threading
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_IDENT = re.compile(r"^[a-z_][a-z0-9_]*$")
# 非 "id" 為主鍵的資料表（用於 upsert 的衝突欄位）
_PRIMARY_KEYS = {"market_symbols": "symbol"}


class DatabaseNotConfigured(RuntimeError):
    pass


def _ident(name: str) -> str:
    if not _IDENT.match(name):
        raise ValueError(f"非法的識別名稱: {name!r}")
    return f'"{name}"'


def _clean(value: Any) -> Any:
    """把 DB 型別轉成 API 層慣用的 Python 型別 (Decimal -> float, UUID -> str)"""
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, UUID):
        return str(value)
    return value


class Result:
    def __init__(self, data: List[Dict[str, Any]]):
        self.data = data


class Query:
    def __init__(self, pool: ConnectionPool, table: str):
        self._pool = pool
        self._table = _ident(table)
        self._table_name = table
        self._op = "select"
        self._cols = "*"
        self._payload: Optional[Dict[str, Any]] = None
        self._filters: List[tuple] = []
        self._order: Optional[tuple] = None
        self._limit: Optional[int] = None
        self._on_conflict: Optional[str] = None

    # ---- 組裝
    def select(self, cols: str = "*") -> "Query":
        self._op, self._cols = "select", cols
        return self

    def insert(self, payload: Dict[str, Any]) -> "Query":
        self._op, self._payload = "insert", payload
        return self

    def update(self, payload: Dict[str, Any]) -> "Query":
        self._op, self._payload = "update", payload
        return self

    def upsert(self, payload: Dict[str, Any], on_conflict: Optional[str] = None) -> "Query":
        self._op, self._payload, self._on_conflict = "upsert", payload, on_conflict
        return self

    def delete(self) -> "Query":
        self._op = "delete"
        return self

    def eq(self, col: str, value: Any) -> "Query":
        self._filters.append((col, value))
        return self

    def order(self, col: str, desc: bool = False) -> "Query":
        self._order = (col, desc)
        return self

    def limit(self, n: int) -> "Query":
        self._limit = int(n)
        return self

    # ---- 產生 SQL
    def _where(self) -> tuple:
        if not self._filters:
            return "", []
        parts, params = [], []
        for col, val in self._filters:
            if val is None:
                parts.append(f"{_ident(col)} IS NULL")
            else:
                parts.append(f"{_ident(col)} = %s")
                params.append(val)
        return " WHERE " + " AND ".join(parts), params

    def build(self) -> tuple:
        where, wparams = self._where()
        if self._op == "select":
            cols = "*" if self._cols.strip() == "*" else ", ".join(_ident(c.strip()) for c in self._cols.split(","))
            sql = f"SELECT {cols} FROM {self._table}{where}"
            if self._order:
                sql += f" ORDER BY {_ident(self._order[0])} {'DESC' if self._order[1] else 'ASC'}"
            if self._limit is not None:
                sql += f" LIMIT {self._limit}"
            return sql, wparams
        if self._op in ("insert", "upsert"):
            keys = list(self._payload or {})
            if not keys:
                raise ValueError("insert 需要至少一個欄位")
            cols = ", ".join(_ident(k) for k in keys)
            ph = ", ".join(["%s"] * len(keys))
            sql = f"INSERT INTO {self._table} ({cols}) VALUES ({ph})"
            if self._op == "upsert":
                conflict = self._on_conflict or _PRIMARY_KEYS.get(self._table_name, "id")
                sets = ", ".join(f"{_ident(k)} = EXCLUDED.{_ident(k)}" for k in keys if k != conflict)
                sql += f" ON CONFLICT ({_ident(conflict)}) " + (f"DO UPDATE SET {sets}" if sets else "DO NOTHING")
            return sql + " RETURNING *", [self._payload[k] for k in keys]
        if self._op == "update":
            keys = list(self._payload or {})
            if not keys:
                raise ValueError("update 需要至少一個欄位")
            sets = ", ".join(f"{_ident(k)} = %s" for k in keys)
            return f"UPDATE {self._table} SET {sets}{where} RETURNING *", [self._payload[k] for k in keys] + wparams
        if self._op == "delete":
            return f"DELETE FROM {self._table}{where} RETURNING *", wparams
        raise ValueError(self._op)

    # ---- 執行
    def execute(self) -> Result:
        sql, params = self.build()
        try:
            with self._pool.connection() as conn:
                cur = conn.execute(sql, params)
                rows = cur.fetchall() if cur.description else []
        except (psycopg.errors.InvalidTextRepresentation, psycopg.errors.InvalidDatetimeFormat):
            # 例如傳入格式不正確的 UUID：視為查無資料
            if self._op in ("select", "update", "delete"):
                return Result([])
            raise
        return Result([{k: _clean(v) for k, v in row.items()} for row in rows])


class Database:
    def __init__(self, dsn: str):
        self._pool = ConnectionPool(
            conninfo=dsn,
            min_size=1,
            max_size=5,
            max_idle=240,                       # Neon 閒置會休眠，勿長期持有連線
            check=ConnectionPool.check_connection,
            kwargs={"row_factory": dict_row, "autocommit": True, "prepare_threshold": None},  # 相容 pgbouncer
            open=False,
        )
        self._opened = False
        self._lock = threading.Lock()

    def _ensure_open(self):
        if not self._opened:
            with self._lock:
                if not self._opened:
                    self._pool.open(wait=True, timeout=30)
                    self._opened = True

    def table(self, name: str) -> Query:
        self._ensure_open()
        return Query(self._pool, name)

    def ensure_schema(self) -> None:
        """建立所有資料表（皆為 IF NOT EXISTS，可重複執行）"""
        self._ensure_open()
        sql = (Path(__file__).with_name("schema.sql")).read_text(encoding="utf-8")
        with self._pool.connection() as conn:
            conn.execute(sql)
        logger.info("Database schema ensured")

    def close(self) -> None:
        if self._opened:
            self._pool.close()


_db: Optional[Database] = None
_db_lock = threading.Lock()


def get_database() -> Database:
    global _db
    if _db is None:
        with _db_lock:
            if _db is None:
                url = get_settings().database_url
                if not url:
                    raise DatabaseNotConfigured("尚未設定 DATABASE_URL（Neon 連線字串），資料庫功能無法使用")
                _db = Database(url)
    return _db
