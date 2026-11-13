import json
from typing import Annotated, Any, Union
from pydantic import BeforeValidator, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors(v: Any) -> list[str]:
    if isinstance(v, str):
        if not v.strip():
            return []
        if v.startswith("[") and v.endswith("]"):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                pass
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, (list, set, tuple)):
        return [str(i) for i in v]
    return []


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "SentinelOps"
    TAGLINE: str = "Observe. Detect. Investigate. Resolve."
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # CORS
    BACKEND_CORS_ORIGINS: Annotated[list[str], BeforeValidator(parse_cors)] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Database Configuration
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "sentinel"
    POSTGRES_PASSWORD: str = "sentinel_secret"
    POSTGRES_DB: str = "sentinelops_db"
    DATABASE_URL: Union[str, None] = None

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: float = 30.0
    DB_POOL_PRE_PING: bool = True

    # Health & Diagnostics
    HEALTH_TIMEOUT_SECONDS: float = 3.0

    # Prometheus Telemetry Integration (Phase 2)
    PROMETHEUS_URL: str = "http://127.0.0.1:9090"
    PROMETHEUS_TIMEOUT_SECONDS: float = 5.0

    # Infrastructure Metric Alerting & Status Thresholds
    CPU_WARNING_THRESHOLD: float = 75.0
    CPU_CRITICAL_THRESHOLD: float = 90.0
    MEMORY_WARNING_THRESHOLD: float = 80.0
    MEMORY_CRITICAL_THRESHOLD: float = 92.0
    DISK_WARNING_THRESHOLD: float = 85.0
    DISK_CRITICAL_THRESHOLD: float = 95.0

    @computed_field  # type: ignore[prop-decorator]
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        if self.DATABASE_URL:
            # If standard postgresql:// is provided, convert to postgresql+psycopg:// for async psycopg3
            if self.DATABASE_URL.startswith("postgresql://"):
                return self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
            return self.DATABASE_URL
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


settings = Settings()

