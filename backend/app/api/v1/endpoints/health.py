import logging
from fastapi import APIRouter, status, Response
from app.services.health_service import health_service
from app.schemas.health import (
    LivenessResponse,
    ReadinessResponse,
    SystemInfoResponse,
)
from app.schemas.common import HealthStatusEnum

router = APIRouter()
logger = logging.getLogger("sentinelops.api.health")


@router.get(
    "/live",
    response_model=LivenessResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Liveness Probe",
    description="Returns 200 OK if the FastAPI process is responsive and running.",
)
async def get_liveness() -> LivenessResponse:
    return health_service.check_liveness()


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    summary="Database Connectivity & Readiness Probe",
    description="Probes PostgreSQL database connectivity with SELECT 1 and verifies readiness.",
    responses={
        200: {"description": "Service and database are healthy and ready to accept traffic"},
        503: {"description": "Service dependencies (PostgreSQL) are not ready"},
    },
)
async def get_readiness(response: Response) -> ReadinessResponse:
    readiness = await health_service.check_readiness()
    if readiness.status != HealthStatusEnum.HEALTHY:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    else:
        response.status_code = status.HTTP_200_OK
    return readiness


@router.get(
    "/info",
    response_model=SystemInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="System and Environment Information",
    description="Returns version metadata, environment settings, and runtime diagnostic details.",
)
async def get_system_info() -> SystemInfoResponse:
    return health_service.get_system_info()


# Convenience alias for top-level health
@router.get(
    "",
    response_model=LivenessResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def get_health_alias() -> LivenessResponse:
    return health_service.check_liveness()

