from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Postgres (Neon) 連線字串，例如 postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
    database_url: str = ""

    # Gemini AI
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"  # 失敗時依序退回 gemini-2.0-flash / gemini-flash-latest
    # 額度安全隔離開關：預設 False，禁止外部訪客消耗站長後端 .env 的私有 Gemini 配額 (強制 BYOK)
    allow_public_shared_key: bool = False
    admin_api_key: str = ""

    # FinMind
    finmind_api_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # TWSE
    twse_base_url: str = "https://mis.twse.com.tw"

    # App
    app_name: str = "AI Stock Monitor"
    debug: bool = True

    model_config = {"env_file": "../../.env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
