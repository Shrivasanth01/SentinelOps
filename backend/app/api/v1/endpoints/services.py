import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.services import (
    MonitoredServiceCreate,
    MonitoredServiceResponse,
    MonitoredServiceUpdate,
    ServicesListResponse,
    WindowsServicesResponse,
)
from app.services.monitored_service_service import monitored_service_service
from app.services.windows_services_service import windows_services_service

logger = logging.getLogger("sentinelops.api.v1.services")

router = APIRouter()


@router.get(
    "",
    response_model=ServicesListResponse,
    summary="List Monitored Application Services & Endpoints",
    description="Retrieves all configured monitoring targets with real-time Blackbox Exporter availability diagnostics.",
)
async def list_services(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ServicesListResponse:
    return await monitored_service_service.probe_all_services(session)


@router.post(
    "",
    response_model=MonitoredServiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Monitored Application Service Target",
    description="Registers a new target endpoint in PostgreSQL. URL is validated for security and protocol restrictions.",
)
async def create_service(
    data: MonitoredServiceCreate,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> MonitoredServiceResponse:
    record = await monitored_service_service.create_service(session, data)
    # Immediately probe the newly registered target
    return await monitored_service_service.probe_target(record)


@router.get(
    "/windows/overview",
    response_model=WindowsServicesResponse,
    summary="Get Monitored Windows Services State",
    description="Retrieves operational running state and startup configuration for Windows services from Windows Exporter.",
)
async def get_windows_services(
    services: Optional[list[str]] = Query(default=None, description="Optional service name filters"),
) -> WindowsServicesResponse:
    return await windows_services_service.get_windows_services(target_services=services)


@router.get(
    "/{service_id}",
    response_model=MonitoredServiceResponse,
    summary="Get Monitored Service Target Details & Live Probe",
    description="Retrieves target configuration and performs an instant live probe check.",
)
async def get_service(
    service_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> MonitoredServiceResponse:
    record = await monitored_service_service.get_service(session, service_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitored service target '{service_id}' not found",
        )
    return await monitored_service_service.probe_target(record)


@router.patch(
    "/{service_id}",
    response_model=MonitoredServiceResponse,
    summary="Update Monitored Service Configuration",
    description="Updates target URL, probe parameters, expected HTTP status, or pauses monitoring.",
)
async def update_service(
    service_id: str,
    data: MonitoredServiceUpdate,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> MonitoredServiceResponse:
    record = await monitored_service_service.update_service(session, service_id, data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitored service target '{service_id}' not found",
        )
    return await monitored_service_service.probe_target(record)


@router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Monitored Service Target",
    description="Permanently removes target from PostgreSQL.",
)
async def delete_service(
    service_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    deleted = await monitored_service_service.delete_service(session, service_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Monitored service target '{service_id}' not found",
        )

