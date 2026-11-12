from fastapi import APIRouter, Query, Response
from app.services.metrics_service import metrics_service
from app.monitoring.prometheus import get_prometheus_output
from app.schemas.metrics import (
    HostMetricsSnapshot,
    MetricsHistoryResponse,
    MetricsSummaryResponse,
)

router = APIRouter()


@router.get(
    "/current",
    response_model=HostMetricsSnapshot,
    summary="Instantaneous Host Telemetry Snapshot",
    description="Returns real measured host metrics for CPU, memory, storage partitions, and network I/O.",
)
async def get_current_metrics() -> HostMetricsSnapshot:
    return metrics_service.get_current()


@router.get(
    "/history",
    response_model=MetricsHistoryResponse,
    summary="Historical Telemetry Time-Series",
    description="Returns ordered historical metric snapshots for high-resolution dashboard charting.",
)
async def get_metrics_history(
    limit: int = Query(60, ge=1, le=240, description="Maximum number of historical snapshots to return")
) -> MetricsHistoryResponse:
    return metrics_service.get_history(limit=limit)


@router.get(
    "/summary",
    response_model=MetricsSummaryResponse,
    summary="Telemetry Statistical Rollup",
    description="Computes average, minimum, and peak metrics across the specified time window.",
)
async def get_metrics_summary(
    window_seconds: float = Query(300.0, ge=10.0, le=3600.0, description="Rolling time window in seconds")
) -> MetricsSummaryResponse:
    return metrics_service.get_summary(window_seconds=window_seconds)


@router.get(
    "/prometheus",
    summary="Prometheus Metrics Scrape Target",
    description="Exposes SentinelOps telemetry in Prometheus exposition format.",
)
async def get_prometheus_metrics():
    content, content_type = get_prometheus_output()
    return Response(content=content, media_type=content_type)

