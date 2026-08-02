from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Gemini AI
    gemini_api_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    # TWSE
    twse_base_url: str = "https://mis.twse.com.tw"

    # App
    app_name: str = "AI Stock Monitor"
    debug: bool = True

    model_config = {"env_file": "../../.env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
