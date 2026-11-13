from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class HealthState(str, Enum):
    HEALTHY = "HEALTHY"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class TargetHealth(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    UNKNOWN = "UNKNOWN"


class TargetStatus(BaseModel):
    name: str = Field(..., description="Target scrape job name or identifier")
    url: str = Field(..., description="Scrape target endpoint URL")
    health: TargetHealth = Field(default=TargetHealth.UNKNOWN, description="Target health status")
    last_scraped_at: Optional[datetime] = Field(default=None, description="Timestamp of last successful scrape")
    last_error: Optional[str] = Field(default=None, description="Last scrape error message if down")
    scrape_duration_ms: Optional[float] = Field(default=None, description="Duration of last scrape in milliseconds")
    labels: dict[str, str] = Field(default_factory=dict, description="Target labels configured in Prometheus")


class TargetsResponse(BaseModel):
    status: str = Field(default="success")
    total_targets: int = 0
    up_targets: int = 0
    targets: list[TargetStatus] = Field(default_factory=list)


class CpuMetricData(BaseModel):
    overall_percent: Optional[float] = Field(default=None, description="Overall CPU usage percentage")
    core_count: Optional[int] = Field(default=None, description="Number of CPU cores detected")
    cores: list[float] = Field(default_factory=list, description="Per-core CPU percentage")
    user_percent: Optional[float] = Field(default=None, description="Time spent in user mode percentage")
    system_percent: Optional[float] = Field(default=None, description="Time spent in system/kernel mode percentage")
    idle_percent: Optional[float] = Field(default=None, description="Time spent idle percentage")
    interrupt_percent: Optional[float] = Field(default=None, description="Time spent servicing interrupts percentage")
    dpc_percent: Optional[float] = Field(default=None, description="Time spent servicing DPCs percentage")
    status: HealthState = Field(default=HealthState.UNKNOWN, description="Health status evaluated against thresholds")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemoryMetricData(BaseModel):
    total_bytes: Optional[int] = Field(default=None, description="Total physical RAM in bytes")
    used_bytes: Optional[int] = Field(default=None, description="Used physical RAM in bytes")
    free_bytes: Optional[int] = Field(default=None, description="Available/Free physical RAM in bytes")
    percent: Optional[float] = Field(default=None, description="RAM utilization percentage")
    commit_limit_bytes: Optional[int] = Field(default=None, description="Total commit charge limit in bytes")
    commit_total_bytes: Optional[int] = Field(default=None, description="Current committed memory in bytes")
    status: HealthState = Field(default=HealthState.UNKNOWN, description="Health status evaluated against thresholds")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DiskVolumeData(BaseModel):
    volume: str = Field(..., description="Drive letter or mount point (e.g. C:, D:)")
    total_bytes: Optional[int] = Field(default=None, description="Total volume storage capacity in bytes")
    used_bytes: Optional[int] = Field(default=None, description="Used volume storage in bytes")
    free_bytes: Optional[int] = Field(default=None, description="Free volume storage in bytes")
    percent: Optional[float] = Field(default=None, description="Volume utilization percentage")
    status: HealthState = Field(default=HealthState.UNKNOWN, description="Health status for this volume")


class DiskMetricData(BaseModel):
    volumes: list[DiskVolumeData] = Field(default_factory=list, description="List of logical disk volumes")
    total_read_bytes_per_sec: Optional[float] = Field(default=None, description="Aggregate disk read rate in bytes/sec")
    total_write_bytes_per_sec: Optional[float] = Field(default=None, description="Aggregate disk write rate in bytes/sec")
    status: HealthState = Field(default=HealthState.UNKNOWN, description="Aggregate disk health status")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NetworkInterfaceData(BaseModel):
    interface: str = Field(..., description="Network interface name")
    rx_bytes_per_sec: Optional[float] = Field(default=None, description="Received bytes per second")
    tx_bytes_per_sec: Optional[float] = Field(default=None, description="Transmitted bytes per second")


class NetworkMetricData(BaseModel):
    rx_bytes_per_sec: Optional[float] = Field(default=None, description="Aggregate network receive throughput (bytes/sec)")
    tx_bytes_per_sec: Optional[float] = Field(default=None, description="Aggregate network transmit throughput (bytes/sec)")
    interfaces: list[NetworkInterfaceData] = Field(default_factory=list, description="Per-NIC network statistics")
    status: HealthState = Field(default=HealthState.UNKNOWN, description="Network operational health status")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SystemInfoData(BaseModel):
    hostname: Optional[str] = Field(default=None, description="Monitored host machine name")
    os_name: Optional[str] = Field(default=None, description="Operating system product name")
    os_version: Optional[str] = Field(default=None, description="Operating system build/version")
    os_build: Optional[str] = Field(default=None, description="Build number")
    uptime_seconds: Optional[float] = Field(default=None, description="System uptime duration in seconds")
    boot_time: Optional[datetime] = Field(default=None, description="System boot timestamp")
    process_count: Optional[int] = Field(default=None, description="Active system processes count")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InfrastructureHealthData(BaseModel):
    state: HealthState = Field(default=HealthState.UNKNOWN, description="Composite infrastructure health state")
    summary: str = Field(..., description="High-level operational summary text")
    reasons: list[str] = Field(default_factory=list, description="List of detected anomalies or status messages")
    target_status: TargetHealth = Field(default=TargetHealth.UNKNOWN, description="Windows Exporter scrape state")
    prometheus_connected: bool = Field(default=False, description="Whether Prometheus server is reachable")
    last_checked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MonitoringOverviewResponse(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    health: InfrastructureHealthData
    cpu: CpuMetricData
    memory: MemoryMetricData
    disk: DiskMetricData
    network: NetworkMetricData
    system: SystemInfoData
    targets: list[TargetStatus] = Field(default_factory=list)


class HistoryPoint(BaseModel):
    timestamp: float = Field(..., description="Unix epoch timestamp in seconds")
    value: Optional[float] = Field(default=None, description="Sampled metric value")


class HistorySeries(BaseModel):
    metric: str = Field(..., description="Metric identifier key (e.g. cpu_utilization, memory_percent)")
    label: str = Field(..., description="Human-readable series name")
    unit: str = Field(default="", description="Metric unit symbol")
    points: list[HistoryPoint] = Field(default_factory=list)


class HistoryMetricsResponse(BaseModel):
    series: list[HistorySeries] = Field(default_factory=list)
    start: float = Field(..., description="Range start unix epoch seconds")
    end: float = Field(..., description="Range end unix epoch seconds")
    step: str = Field(..., description="Step interval string (e.g. 15s, 60s)")
