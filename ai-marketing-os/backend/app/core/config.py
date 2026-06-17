from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    APP_NAME: str = "AI Marketing OS"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "change-this-in-production-super-secret-key-minimum-32-chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_marketing_os"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_ECHO: bool = False

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    OPENAI_API_KEY: Optional[str] = None
    OPENAI_DEFAULT_MODEL: str = "gpt-4o"
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_DEFAULT_MODEL: str = "claude-3-5-sonnet-20241022"
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_DEFAULT_MODEL: str = "gemini-1.5-pro"
    GROK_API_KEY: Optional[str] = None
    GROK_DEFAULT_MODEL: str = "grok-beta"
    GROK_BASE_URL: str = "https://api.x.ai/v1"

    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None
    INSTAGRAM_ACCESS_TOKEN: Optional[str] = None
    WORDPRESS_DEFAULT_URL: Optional[str] = None

    META_ADS_ACCESS_TOKEN: Optional[str] = None
    META_ADS_APP_ID: Optional[str] = None
    META_ADS_APP_SECRET: Optional[str] = None
    GOOGLE_ADS_DEVELOPER_TOKEN: Optional[str] = None
    GOOGLE_ADS_CLIENT_ID: Optional[str] = None
    GOOGLE_ADS_CLIENT_SECRET: Optional[str] = None
    TIKTOK_ADS_ACCESS_TOKEN: Optional[str] = None
    TIKTOK_ADS_APP_ID: Optional[str] = None

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    CORS_ALLOW_CREDENTIALS: bool = True

    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60
    AI_RATE_LIMIT_REQUESTS: int = 20
    AI_RATE_LIMIT_PERIOD: int = 60

    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = "INFO"

    FRONTEND_URL: str = "http://localhost:3000"

    ENCRYPTION_KEY: Optional[str] = None


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
