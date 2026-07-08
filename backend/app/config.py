# config.py
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DASHSCOPE_API_KEY: str = ""
    QWEN_BASE_URL: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    QWEN_MAX_MODEL: str = "qwen3.7-max"
    QWEN_PLUS_MODEL: str = "qwen3.7-plus"
    QWEN_TURBO_MODEL: str = "qwen3.6-flash"
    DATABASE_URL: str = "sqlite:///./compliance_autopilot.db"
    GITHUB_TOKEN: str = ""
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
