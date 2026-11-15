import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    BaselinesResponse,
    HistoricalMetricResponse,
    TimeRangeEnum,
)
from app.services.analytics_summary_service import analytics_summary_service
from app.services.baseline_service import baseline_service
from app.services.historical_analytics_service import historical_analytics_service

logger = logging.getLogger("sentinelops.api.v1.analytics")

router = APIRouter()


def resolve_time_range(
    time_range: Optional[TimeRangeEnum] = Query(default=None, description="Time window: 15m, 1h, 6h, 24h, 7d"),
    range: Optional[TimeRangeEnum] = Query(default=None, description="Alternative alias for time window"),
) -> str:
    selected = time_range or range or TimeRangeEnum.LAST_15M
    return selected.value


@router.get(
    "/cpu/history",
    response_model=HistoricalMetricResponse,
    summary="Get CPU Historical Telemetry & Trends",
    description="Retrieves historical CPU timeseries, average, peak, floor, and usage trajectory.",
)
async def get_cpu_history(
    range_val: str = Depends(resolve_time_range),
) -> HistoricalMetricResponse:
    return await historical_analytics_service.get_cpu_history(time_range=range_val)


@router.get(
    "/memory/history",
    response_model=HistoricalMetricResponse,
    summary="Get Memory Historical Telemetry & Trends",
    description="Retrieves historical RAM utilization percentage, used/available bytes, and consumption growth.",
)
async def get_memory_history(
    range_val: str = Depends(resolve_time_range),
) -> HistoricalMetricResponse:
    return await historical_analytics_service.get_memory_history(time_range=range_val)


@router.get(
    "/disk/history",
    response_model=HistoricalMetricResponse,
    summary="Get Disk Space & I/O Historical Telemetry",
    description="Retrieves historical logical volume utilization, available capacity, and I/O throughput rates.",
)
async def get_disk_history(
    range_val: str = Depends(resolve_time_range),
) -> HistoricalMetricResponse:
    return await historical_analytics_service.get_disk_history(time_range=range_val)


@router.get(
    "/network/history",
    response_model=HistoricalMetricResponse,
    summary="Get Network Throughput Historical Telemetry",
    description="Retrieves incoming (Rx) and outgoing (Tx) throughput timeseries and traffic trends.",
)
async def get_network_history(
    range_val: str = Depends(resolve_time_range),
) -> HistoricalMetricResponse:
    return await historical_analytics_service.get_network_history(time_range=range_val)


@router.get(
    "/baselines",
    response_model=BaselinesResponse,
    summary="Get Statistical Performance Baselines & Deviation Indicators",
    description="Calculates historical mean, median, stddev, rolling average, and compares with live values.",
)
async def get_baselines(
    baseline_duration: str = Query(default="24h", description="Baseline training window: 1h or 24h"),
) -> BaselinesResponse:
    return await baseline_service.get_baselines(baseline_duration=baseline_duration)


@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
    summary="Get Executive Telemetry Analytics Scorecard",
    description="Synthesizes platform stability index, critical subsystem trends, and overall service availability.",
)
async def get_analytics_summary(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AnalyticsSummaryResponse:
    return await analytics_summary_service.get_summary(session=session)
