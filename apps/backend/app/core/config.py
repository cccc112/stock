from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Postgres (Neon) 連線字串，例如 postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
    database_url: str = ""

    # Gemini AI
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"  # 失敗時依序退回 gemini-flash-latest；舊版模型名稱會被下架(404)

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
