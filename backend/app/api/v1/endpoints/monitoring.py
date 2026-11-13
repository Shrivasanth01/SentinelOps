import logging
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from app.monitoring.prometheus_client import PrometheusClient
from app.monitoring.services import (
    CpuMonitoringService,
    DiskMonitoringService,
    HealthMonitoringService,
    HistoryMonitoringService,
    MemoryMonitoringService,
    NetworkMonitoringService,
    OverviewMonitoringService,
    SystemMonitoringService,
)
from app.schemas.monitoring import (
    CpuMetricData,
    DiskMetricData,
    HistoryMetricsResponse,
    MemoryMetricData,
    MonitoringOverviewResponse,
    NetworkMetricData,
    SystemInfoData,
    TargetsResponse,
)

logger = logging.getLogger("sentinelops.api.v1.monitoring")

router = APIRouter()


# Dependency providers for easy testing & overriding
def get_prometheus_client() -> PrometheusClient:
    return PrometheusClient()


def get_overview_service(
    client: Annotated[PrometheusClient, Depends(get_prometheus_client)],
) -> OverviewMonitoringService:
    return OverviewMonitoringService(client)


def get_cpu_service(
    client: Annotated[PrometheusClient, Depends(get_prometheus_client)],
) -> CpuMonitoringService:
    return CpuMonitoringService(client)


def get_memory_service(
    client: Annotated[PrometheusClient, Depends(get_prometheus_client)],
) -> MemoryMonitoringService:
    return MemoryMonitoringService(client)


def get_disk_service(
    client: Annotated[PrometheusClient, Depends(get_prometheus_client)],
) -> DiskMonitoringService:
    return DiskMonitoringService(client)


def get_network_service(
    client: Annotated[PrometheusClient, Depends(get_prometheus_client)],
) -> NetworkMonitoringService:
    return NetworkMonitoringService(client)


def get_system_service(
    client: Annotated[PrometheusClient, Depends(get_prometheus_client)],
) -> SystemMonitoringService:
    return SystemMonitoringService(client)


def get_health_service(
    client: Annotated[PrometheusClient, Depends(get_prometheus_client)],
) -> HealthMonitoringService:
    return HealthMonitoringService(client)


def get_history_service(
    client: Annotated[PrometheusClient, Depends(get_prometheus_client)],
) -> HistoryMonitoringService:
    return HistoryMonitoringService(client)


@router.get(
    "/overview",
    response_model=MonitoringOverviewResponse,
    summary="Get Infrastructure Monitoring Overview",
    description="Gathers synthesized host telemetry including CPU, memory, disk, network, system, health and targets.",
)
async def get_monitoring_overview(
    service: Annotated[OverviewMonitoringService, Depends(get_overview_service)],
) -> MonitoringOverviewResponse:
    return await service.get_overview()


@router.get(
    "/cpu",
    response_model=CpuMetricData,
    summary="Get Host CPU Utilization",
    description="Retrieves overall CPU percent, per-core breakdown, and user/system mode telemetry.",
)
async def get_cpu_metrics(
    service: Annotated[CpuMonitoringService, Depends(get_cpu_service)],
) -> CpuMetricData:
    return await service.get_cpu_metrics()


@router.get(
    "/memory",
    response_model=MemoryMetricData,
    summary="Get Host Memory Utilization",
    description="Retrieves total, used, free RAM bytes, utilization percentage, and commit limits.",
)
async def get_memory_metrics(
    service: Annotated[MemoryMonitoringService, Depends(get_memory_service)],
) -> MemoryMetricData:
    return await service.get_memory_metrics()


@router.get(
    "/disk",
    response_model=DiskMetricData,
    summary="Get Logical Disk Utilization and I/O Rates",
    description="Retrieves partition capacities, free space, and disk read/write throughput.",
)
async def get_disk_metrics(
    service: Annotated[DiskMonitoringService, Depends(get_disk_service)],
) -> DiskMetricData:
    return await service.get_disk_metrics()


@router.get(
    "/network",
    response_model=NetworkMetricData,
    summary="Get Network Throughput",
    description="Retrieves aggregate and per-NIC receive (Rx) and transmit (Tx) throughput rates.",
)
async def get_network_metrics(
    service: Annotated[NetworkMonitoringService, Depends(get_network_service)],
) -> NetworkMetricData:
    return await service.get_network_metrics()


@router.get(
    "/system",
    response_model=SystemInfoData,
    summary="Get Monitored Host System Information",
    description="Retrieves OS version, build, boot time, system uptime, and active process count.",
)
async def get_system_info(
    service: Annotated[SystemMonitoringService, Depends(get_system_service)],
) -> SystemInfoData:
    return await service.get_system_info()


@router.get(
    "/targets",
    response_model=TargetsResponse,
    summary="Get Prometheus Scrape Targets Status",
    description="Lists configured Prometheus scrape targets, scrape health (UP/DOWN), latency, and errors.",
)
async def get_targets(
    service: Annotated[HealthMonitoringService, Depends(get_health_service)],
) -> TargetsResponse:
    return await service.get_targets_status()


@router.get(
    "/history",
    response_model=HistoryMetricsResponse,
    summary="Get Telemetry Timeseries History",
    description="Queries Prometheus range vectors for CPU, memory, disk, and network over a requested duration.",
)
async def get_history(
    service: Annotated[HistoryMonitoringService, Depends(get_history_service)],
    metrics: list[str] = Query(
        default=["cpu", "memory", "disk", "network"],
        description="List of metrics to include (cpu, memory, disk, network)",
    ),
    duration: str = Query(
        default="15m",
        description="Time range duration (e.g. 15m, 1h, 6h, 24h)",
    ),
    step: str = Query(
        default="15s",
        description="Query resolution step (e.g. 15s, 60s)",
    ),
) -> HistoryMetricsResponse:
    return await service.get_history(metrics=metrics, duration=duration, step=step)
