import time
import sys
import platform
from datetime import datetime, timezone
from typing import Dict, Any

from app.core.config import settings
from app.db.session import check_database_connectivity
from app.schemas.common import HealthStatusEnum
from app.schemas.health import (
    LivenessResponse,
    ReadinessResponse,
    DatabaseHealth,
    SystemInfoResponse,
)

# Startup time record
_STARTUP_TIME = time.time()


class HealthService:
    @staticmethod
    def get_uptime_seconds() -> float:
        return round(time.time() - _STARTUP_TIME, 2)

    @staticmethod
    def check_liveness() -> LivenessResponse:
        return LivenessResponse(
            status=HealthStatusEnum.HEALTHY,
            app_name=settings.PROJECT_NAME,
            version=settings.VERSION,
            uptime_seconds=HealthService.get_uptime_seconds(),
            timestamp=datetime.now(timezone.utc),
        )

    @staticmethod
    async def check_readiness() -> ReadinessResponse:
        is_healthy, latency_ms, metadata = await check_database_connectivity(
            timeout=settings.HEALTH_TIMEOUT_SECONDS
        )

        db_status = HealthStatusEnum.HEALTHY if is_healthy else HealthStatusEnum.UNHEALTHY
        overall_status = HealthStatusEnum.HEALTHY if is_healthy else HealthStatusEnum.UNHEALTHY

        error_msg = metadata.get("error") if not is_healthy else None
        pool_info = metadata if is_healthy else None

        db_health = DatabaseHealth(
            status=db_status,
            connected=is_healthy,
            latency_ms=latency_ms,
            pool_info=pool_info,
            error=error_msg,
        )

        return ReadinessResponse(
            status=overall_status,
            database=db_health,
            timestamp=datetime.now(timezone.utc),
        )

    @staticmethod
    def get_system_info() -> SystemInfoResponse:
        return SystemInfoResponse(
            project_name=settings.PROJECT_NAME,
            tagline=settings.TAGLINE,
            version=settings.VERSION,
            environment=settings.ENVIRONMENT,
            debug=settings.DEBUG,
            python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            os_platform=platform.platform(),
            timestamp=datetime.now(timezone.utc),
        )


health_service = HealthService()

