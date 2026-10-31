from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./viettour.db"
    app_env: Literal["development", "production"] = "production"
    jwt_secret: str = ""
    initial_admin_username: str = ""
    initial_admin_password: str = ""
    # Gemini API key (ưu tiên cao nhất)
    gemini_api_key: str = ""
    # Gemini model mặc định
    gemini_model: str = "gemini-3.6-flash"
    # Fallback: OpenAI-compatible endpoint
    ai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"
    ai_base_url: str = "https://api.openai.com/v1"
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
