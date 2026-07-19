# config.py
import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to this file so Settings load correctly regardless of
# the process's current working directory (e.g. when uvicorn is launched with
# --app-dir from a parent directory).
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    DASHSCOPE_API_KEY: str = ""
    QWEN_BASE_URL: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    QWEN_MAX_MODEL: str = "qwen3.7-max"
    QWEN_PLUS_MODEL: str = "qwen3.7-plus"
    QWEN_TURBO_MODEL: str = "qwen3.6-flash"
    DATABASE_URL: str = "sqlite:///./compliance_autopilot.db"
    GITHUB_TOKEN: str = ""
    API_ACCESS_TOKEN: str = ""
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
    ]

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
