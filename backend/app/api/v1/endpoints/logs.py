from fastapi import APIRouter, Query, BackgroundTasks
from typing import Optional
from app.services.log_service import log_service
from app.schemas.logs import (
    LogEntryCreate,
    LogEntry,
    LogLevelEnum,
    LogsListResponse,
)

router = APIRouter()


@router.get(
    "",
    response_model=LogsListResponse,
    summary="Query Structured System Logs",
    description="Filters logs from memory buffer and persistent storage by level, service, or keyword.",
)
async def get_logs(
    level: Optional[LogLevelEnum] = Query(None, description="Filter by log severity"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    search: Optional[str] = Query(None, description="Free text search query"),
    limit: int = Query(50, ge=1, le=200, description="Max logs to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> LogsListResponse:
    return log_service.query_logs(
        level=level,
        service=service,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/ingest",
    response_model=LogEntry,
    status_code=201,
    summary="Ingest Log Event",
    description="Ingests a structured log event into the buffer and persists asynchronously.",
)
async def ingest_log(entry: LogEntryCreate, background_tasks: BackgroundTasks) -> LogEntry:
    log_item = log_service.ingest_log(entry)
    background_tasks.add_task(log_service.persist_log_to_db, log_item)
    return log_item


@router.post(
    "/simulate",
    response_model=LogEntry,
    summary="Simulate System Event",
    description="Generates a diagnostic log event for live tailing verification.",
)
async def simulate_event(
    level: LogLevelEnum = Query(LogLevelEnum.INFO),
    service: str = Query("demo-service"),
    message: str = Query("Simulated diagnostic event"),
) -> LogEntry:
    entry = LogEntryCreate(
        level=level,
        service=service,
        message=message,
        source_ip="127.0.0.1",
        metadata={"simulated": True},
    )
    return log_service.ingest_log(entry)

