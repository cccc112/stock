"""SQL 組裝邏輯測試（不需要資料庫）。執行: python -m unittest discover -s tests"""
import unittest
from pathlib import Path

from app.core.db import Query


def q(table: str) -> Query:
    return Query(pool=None, table=table)  # build() 不會用到 pool


class QueryBuilderTest(unittest.TestCase):
    def test_select_filters_order_limit(self):
        sql, params = q("sim_transactions").select("*").eq("portfolio_id", "abc").order("timestamp", desc=True).limit(5).build()
        self.assertEqual(sql, 'SELECT * FROM "sim_transactions" WHERE "portfolio_id" = %s ORDER BY "timestamp" DESC LIMIT 5')
        self.assertEqual(params, ["abc"])

    def test_select_columns_and_multiple_eq(self):
        sql, params = q("sim_transactions").select("symbol, type").eq("portfolio_id", "p").eq("symbol", "2330").build()
        self.assertEqual(sql, 'SELECT "symbol", "type" FROM "sim_transactions" WHERE "portfolio_id" = %s AND "symbol" = %s')
        self.assertEqual(params, ["p", "2330"])

    def test_insert_returns_row(self):
        sql, params = q("watchlist").insert({"id": "1", "symbol": "2330", "market": "TW"}).build()
        self.assertEqual(sql, 'INSERT INTO "watchlist" ("id", "symbol", "market") VALUES (%s, %s, %s) RETURNING *')
        self.assertEqual(params, ["1", "2330", "TW"])

    def test_update_param_order(self):
        sql, params = q("alerts").update({"is_active": False}).eq("id", "x").build()
        self.assertEqual(sql, 'UPDATE "alerts" SET "is_active" = %s WHERE "id" = %s RETURNING *')
        self.assertEqual(params, [False, "x"])

    def test_delete(self):
        sql, params = q("watchlist").delete().eq("symbol", "2330").build()
        self.assertEqual(sql, 'DELETE FROM "watchlist" WHERE "symbol" = %s RETURNING *')
        self.assertEqual(params, ["2330"])

    def test_upsert_uses_table_primary_key(self):
        sql, _ = q("market_symbols").upsert({"symbol": "2330", "name": "台積電"}).build()
        self.assertIn('ON CONFLICT ("symbol") DO UPDATE SET "name" = EXCLUDED."name"', sql)

    def test_is_null_filter(self):
        sql, params = q("alerts").select("*").eq("symbol", None).build()
        self.assertIn('"symbol" IS NULL', sql)
        self.assertEqual(params, [])

    def test_sql_injection_in_identifiers_is_rejected(self):
        with self.assertRaises(ValueError):
            q('alerts"; DROP TABLE alerts; --')
        with self.assertRaises(ValueError):
            q("alerts").select("*").eq("id; DROP TABLE alerts", 1).build()
        with self.assertRaises(ValueError):
            q("alerts").select("*").order("id desc; --").build()

    def test_values_are_never_inlined(self):
        evil = "x'; DROP TABLE watchlist; --"
        sql, params = q("watchlist").delete().eq("symbol", evil).build()
        self.assertNotIn("DROP", sql)
        self.assertEqual(params, [evil])


class SchemaFileTest(unittest.TestCase):
    def test_every_table_used_by_the_api_is_defined(self):
        schema = (Path(__file__).parent.parent / "app" / "core" / "schema.sql").read_text(encoding="utf-8")
        for table in ("watchlist", "portfolio_transactions", "alerts", "sim_portfolios",
                      "sim_transactions", "ai_cache", "market_symbols"):
            self.assertIn(f"CREATE TABLE IF NOT EXISTS {table} ", schema)


if __name__ == "__main__":
    unittest.main()
