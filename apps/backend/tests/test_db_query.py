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


class PhantomBarTest(unittest.TestCase):
    """Yahoo 在休市日會多給一根複製前日收盤的日線，應被丟棄"""

    def test_bars_after_latest_session_are_dropped(self):
        from datetime import datetime, timezone
        from app.services.market_data import _chart_to_bars
        off = 8 * 3600
        day = lambda d: int(datetime(2026, 10, d, 1, 0, tzinfo=timezone.utc).timestamp())  # 台北 09:00
        res = {
            "meta": {"gmtoffset": off, "regularMarketTime": day(22) + 4 * 3600 + 30 * 60},  # 10/22 13:30
            "timestamp": [day(21), day(22), day(23)],
            "indicators": {"quote": [{"open": [1, 2, 2], "high": [1, 2, 2], "low": [1, 2, 2],
                                      "close": [2420, 2385, 2385], "volume": [1, 1, 1]}]},
        }
        daily = _chart_to_bars(res, daily=True)
        self.assertEqual([b.time.day for b in daily], [21, 22])
        self.assertEqual(len(_chart_to_bars(res, daily=False)), 3)  # 分時資料不處理


class FinMindBreakerTest(unittest.TestCase):
    def test_rate_limited_returns_empty_without_network(self):
        import asyncio, time
        from app.services.finmind import FinMindService
        svc = FinMindService()
        svc._blocked_until = time.time() + 60
        self.assertTrue(svc.rate_limited)
        self.assertEqual(asyncio.run(svc.get_history("2330", 10)), [])


class GeminiFallbackTest(unittest.TestCase):
    def test_dead_models_are_skipped_after_first_failure(self):
        import asyncio
        from app.services.gemini import GeminiService

        calls = []

        class FakeModels:
            def generate_content(self, model, contents, config=None):
                calls.append(model)
                if model == "retired":
                    raise RuntimeError("404 NOT_FOUND: no longer available")
                return type("R", (), {"text": "ok"})()

        svc = GeminiService()
        svc.client = type("C", (), {"models": FakeModels()})()
        svc.models = ["retired", "alive"]
        self.assertEqual(asyncio.run(svc.generate("hi")), "ok")
        self.assertEqual(calls, ["retired", "alive"])
        calls.clear()
        self.assertEqual(asyncio.run(svc.generate("hi")), "ok")
        self.assertEqual(calls, ["alive"])  # 已下架的模型不再重試


    def test_transient_overload_is_retried_on_the_same_model(self):
        import asyncio
        from app.services.gemini import GeminiService

        calls = []

        class FlakyModels:
            def generate_content(self, model, contents, config=None):
                calls.append(model)
                if len(calls) == 1:
                    raise RuntimeError("503 UNAVAILABLE: high demand")
                return type("R", (), {"text": "ok"})()

        svc = GeminiService()
        svc.client = type("C", (), {"models": FlakyModels()})()
        svc.models, svc.retry_delay = ["m1", "m2"], 0
        self.assertEqual(asyncio.run(svc.generate("hi")), "ok")
        self.assertEqual(calls, ["m1", "m1"])         # 同一個模型重試一次就成功
        self.assertNotIn("m1", svc._dead)             # 過載不代表模型下架

    def test_bad_api_key_stops_immediately(self):
        import asyncio
        from app.services.gemini import GeminiService

        calls = []

        class BadKey:
            def generate_content(self, model, contents, config=None):
                calls.append(model)
                raise RuntimeError("400 API key not valid")

        svc = GeminiService()
        svc.client = type("C", (), {"models": BadKey()})()
        svc.models = ["m1", "m2"]
        with self.assertRaises(RuntimeError):
            asyncio.run(svc.generate("hi"))
        self.assertEqual(calls, ["m1"])               # 金鑰錯誤不必再試其他模型


if __name__ == "__main__":
    unittest.main()
