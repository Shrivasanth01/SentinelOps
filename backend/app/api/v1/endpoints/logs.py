import logging
from typing import Annotated, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.logging_engine.schemas.logs import (
    ErrorIntelligenceResponse,
    LogCorrelationResponse,
    LogEntry,
    LogHealthResponse,
    LogLevelEnum,
    LogSearchResult,
    LogSourceCreate,
    LogSourceResponse,
    LogSourcesListResponse,
    LogSourceUpdate,
    LogSummaryResponse,
    LogTimelineResponse,
)
from app.logging_engine.services.log_correlation_service import log_correlation_service
from app.logging_engine.services.log_query_service import log_query_service
from app.logging_engine.services.log_source_service import log_source_service
from app.schemas.logs import LogEntryCreate, LogEntry as LegacyLogEntry, LogLevelEnum as LegacyLogLevelEnum
from app.services.log_service import log_service

logger = logging.getLogger("sentinelops.api.v1.logs")

router = APIRouter()


@router.get(
    "",
    response_model=LogSearchResult,
    summary="Query Centralized Infrastructure & Application Logs",
    description="Queries Grafana Loki and host collection pipelines with structured filtering, time ranges, and pagination.",
)
async def get_logs(
    level: Optional[LogLevelEnum] = Query(None, description="Filter by normalized log severity"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    source: Optional[str] = Query(None, description="Filter by collection source (WINDOWS_EVENT, APPLICATION_LOG, CONTAINER_LOG, FILE)"),
    search: Optional[str] = Query(None, description="Keyword search query"),
    time_range: str = Query("1h", description="Time window: 15m, 1h, 6h, 24h, 7d"),
    limit: int = Query(50, ge=1, le=200, description="Max logs to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> LogSearchResult:
    return await log_query_service.query_logs(
        level=level,
        service=service,
        source=source,
        search=search,
        time_range=time_range,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/search",
    response_model=LogSearchResult,
    summary="Search Logs via LogQL or Free-Text Filter",
    description="Executes a targeted search using LogQL stream queries or line expressions.",
)
async def search_logs(
    q: str = Query(..., min_length=1, description="Search term or expression"),
    level: Optional[LogLevelEnum] = Query(None, description="Filter by severity"),
    service: Optional[str] = Query(None, description="Filter by service"),
    time_range: str = Query("1h", description="Time window: 15m, 1h, 6h, 24h, 7d"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> LogSearchResult:
    return await log_query_service.query_logs(
        level=level,
        service=service,
        search=q,
        time_range=time_range,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/summary",
    response_model=LogSummaryResponse,
    summary="Get Log Volume & Severity Summary",
    description="Returns severity level distribution, service breakdown, and collection error rate.",
)
async def get_logs_summary(
    time_range: str = Query("24h", description="Time window for analytics calculation"),
) -> LogSummaryResponse:
    return await log_query_service.get_summary(time_range=time_range)


@router.get(
    "/errors",
    response_model=ErrorIntelligenceResponse,
    summary="Get Grouped Error Intelligence",
    description="Groups error and critical logs into normalized pattern fingerprints with recurrence frequencies.",
)
async def get_grouped_errors(
    time_range: str = Query("24h", description="Time window to analyze for recurring error patterns"),
) -> ErrorIntelligenceResponse:
    return await log_query_service.get_error_intelligence(time_range=time_range)


@router.get(
    "/timeline",
    response_model=LogTimelineResponse,
    summary="Get Chronological Log Timeline Buckets",
    description="Aggregates log events into discrete time buckets to visualize distribution and volume bursts.",
)
async def get_log_timeline(
    time_range: str = Query("1h", description="Time window: 15m, 1h, 6h, 24h, 7d"),
    buckets: int = Query(12, ge=4, le=60, description="Number of histogram buckets"),
) -> LogTimelineResponse:
    return await log_query_service.get_timeline(time_range=time_range, bucket_count=buckets)


@router.get(
    "/health",
    response_model=LogHealthResponse,
    summary="Log Ingestion & Loki Health Diagnostics",
    description="Probes Loki connectivity, ingestion pipeline status, and configured collection sources.",
)
async def get_log_health() -> LogHealthResponse:
    return await log_query_service.check_health()


@router.get(
    "/correlate",
    response_model=LogCorrelationResponse,
    summary="Correlate Metric Anomaly with Temporal Logs",
    description="Retrieves logs occurring within an investigation window around a metric spike/anomaly event.",
)
async def correlate_metric_with_logs(
    metric_name: str = Query(..., description="Name of the infrastructure metric (e.g. cpu_utilization)"),
    timestamp: float = Query(..., description="Epoch timestamp in seconds of the metric event"),
    window_seconds: int = Query(300, ge=30, le=3600, description="Investigation window (±seconds)"),
    level: Optional[LogLevelEnum] = Query(None, description="Optional severity filter"),
    service: Optional[str] = Query(None, description="Optional service filter"),
) -> LogCorrelationResponse:
    return await log_correlation_service.correlate_metric_with_logs(
        metric_name=metric_name,
        event_timestamp=timestamp,
        window_seconds=window_seconds,
        severity_filter=level,
        service_filter=service,
    )


# ==============================================================================
# Log Source Configuration CRUD Endpoints
# ==============================================================================

@router.get(
    "/sources",
    response_model=LogSourcesListResponse,
    summary="List Configured Log Sources",
    description="Retrieves all registered Windows Event channels, log files, container monitors, and API log streams.",
)
async def list_log_sources(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> LogSourcesListResponse:
    return await log_source_service.list_sources(session)


@router.post(
    "/sources",
    response_model=LogSourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New Log Collection Source",
    description="Registers an authorized Windows Event channel, container, or validated log file path.",
)
async def create_log_source(
    data: LogSourceCreate,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> LogSourceResponse:
    record = await log_source_service.create_source(session, data)
    return LogSourceResponse.model_validate(record)


@router.get(
    "/sources/{source_id}",
    response_model=LogSourceResponse,
    summary="Get Log Source Details",
    description="Retrieves source configuration and collection metadata by UUID.",
)
async def get_log_source(
    source_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> LogSourceResponse:
    record = await log_source_service.get_source(session, source_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log source '{source_id}' not found",
        )
    return LogSourceResponse.model_validate(record)


@router.patch(
    "/sources/{source_id}",
    response_model=LogSourceResponse,
    summary="Update Log Source Configuration",
    description="Modifies name, format, or enabled state for a log collection target.",
)
async def update_log_source(
    source_id: str,
    data: LogSourceUpdate,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> LogSourceResponse:
    record = await log_source_service.update_source(session, source_id, data)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log source '{source_id}' not found",
        )
    return LogSourceResponse.model_validate(record)


@router.delete(
    "/sources/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Log Collection Source",
    description="Removes a configured log collection source from PostgreSQL.",
)
async def delete_log_source(
    source_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    deleted = await log_source_service.delete_source(session, source_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Log source '{source_id}' not found",
        )


# ==============================================================================
# Legacy Ingest / Simulation Endpoints (Phase 1 Compatibility)
# ==============================================================================

@router.post(
    "/ingest",
    response_model=LegacyLogEntry,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Log Event (Legacy Endpoint)",
    description="Ingests a structured log event into the buffer and persists asynchronously.",
)
async def ingest_log(entry: LogEntryCreate, background_tasks: BackgroundTasks) -> LegacyLogEntry:
    log_item = log_service.ingest_log(entry)
    background_tasks.add_task(log_service.persist_log_to_db, log_item)
    return log_item


@router.post(
    "/simulate",
    response_model=LegacyLogEntry,
    summary="Simulate System Event (Legacy Endpoint)",
    description="Generates a diagnostic log event for live tailing verification.",
)
async def simulate_event(
    level: LegacyLogLevelEnum = Query(LegacyLogLevelEnum.INFO),
    service: str = Query("demo-service"),
    message: str = Query("Simulated diagnostic event"),
) -> LegacyLogEntry:
    entry = LogEntryCreate(
        level=level,
        service=service,
        message=message,
        source_ip="127.0.0.1",
        metadata={"simulated": True},
    )
    return log_service.ingest_log(entry)
