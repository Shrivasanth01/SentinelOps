from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CpuMetrics(BaseModel):
    overall_percent: float = Field(..., description="Overall CPU utilization percentage [0.0 - 100.0]")
    per_cpu_percent: List[float] = Field(default_factory=list, description="Utilization percentage per logical core")
    count_physical: Optional[int] = Field(None, description="Number of physical CPU cores")
    count_logical: int = Field(..., description="Number of logical CPU processors")
    load_avg_1m: Optional[float] = Field(None, description="1-minute load average (Unix only)")
    load_avg_5m: Optional[float] = Field(None, description="5-minute load average (Unix only)")
    load_avg_15m: Optional[float] = Field(None, description="15-minute load average (Unix only)")
    ctx_switches: Optional[int] = Field(None, description="System context switches counter")


class MemoryMetrics(BaseModel):
    total_bytes: int = Field(..., description="Total physical RAM in bytes")
    available_bytes: int = Field(..., description="Available RAM for allocation in bytes")
    used_bytes: int = Field(..., description="Used RAM in bytes")
    free_bytes: int = Field(..., description="Unused/free RAM in bytes")
    percent: float = Field(..., description="RAM utilization percentage [0.0 - 100.0]")
    swap_total_bytes: int = Field(0, description="Total swap space in bytes")
    swap_used_bytes: int = Field(0, description="Used swap space in bytes")
    swap_percent: float = Field(0.0, description="Swap utilization percentage [0.0 - 100.0]")


class DiskPartitionMetrics(BaseModel):
    device: str = Field(..., description="Device identifier or drive letter")
    mountpoint: str = Field(..., description="Filesystem mount point")
    fstype: str = Field(..., description="Filesystem type (ext4, ntfs, apfs, etc.)")
    total_bytes: int = Field(..., description="Total storage capacity in bytes")
    used_bytes: int = Field(..., description="Used storage in bytes")
    free_bytes: int = Field(..., description="Free storage in bytes")
    percent: float = Field(..., description="Partition space utilization percentage")


class DiskMetrics(BaseModel):
    partitions: List[DiskPartitionMetrics] = Field(default_factory=list)
    read_bytes: int = Field(0, description="Cumulative disk read bytes")
    write_bytes: int = Field(0, description="Cumulative disk write bytes")
    read_count: int = Field(0, description="Cumulative read operations")
    write_count: int = Field(0, description="Cumulative write operations")


class NetworkInterfaceMetrics(BaseModel):
    interface: str = Field(..., description="Network interface name (e.g., eth0, wlan0)")
    bytes_sent: int = Field(..., description="Total bytes transmitted")
    bytes_recv: int = Field(..., description="Total bytes received")
    packets_sent: int = Field(..., description="Packets transmitted")
    packets_recv: int = Field(..., description="Packets received")
    errin: int = Field(0, description="Inbound errors")
    errout: int = Field(0, description="Outbound errors")
    dropin: int = Field(0, description="Inbound dropped packets")
    dropout: int = Field(0, description="Outbound dropped packets")


class NetworkMetrics(BaseModel):
    interfaces: List[NetworkInterfaceMetrics] = Field(default_factory=list)
    total_bytes_sent: int = Field(..., description="Aggregate bytes sent across interfaces")
    total_bytes_recv: int = Field(..., description="Aggregate bytes received across interfaces")
    bytes_sent_rate_per_sec: float = Field(0.0, description="Calculated outbound throughput (bytes/sec)")
    bytes_recv_rate_per_sec: float = Field(0.0, description="Calculated inbound throughput (bytes/sec)")


class SystemProcessMetrics(BaseModel):
    process_count: int = Field(..., description="Total currently active OS processes")
    thread_count: Optional[int] = Field(None, description="Total running OS threads")
    boot_time: datetime = Field(..., description="System boot timestamp")
    uptime_seconds: float = Field(..., description="System uptime in seconds")


class HostMetricsSnapshot(BaseModel):
    timestamp: datetime = Field(..., description="UTC timestamp of the measurement")
    host_name: str = Field(..., description="Host network name")
    platform: str = Field(..., description="Operating system platform details")
    cpu: CpuMetrics
    memory: MemoryMetrics
    disk: DiskMetrics
    network: NetworkMetrics
    system: SystemProcessMetrics


class MetricsHistoryResponse(BaseModel):
    snapshots: List[HostMetricsSnapshot] = Field(default_factory=list)
    total_count: int = Field(..., description="Total snapshots returned")
    sampling_interval_seconds: float = Field(..., description="Collection cadence")


class MetricsSummaryResponse(BaseModel):
    sample_count: int
    cpu_percent_avg: float
    cpu_percent_max: float
    cpu_percent_min: float
    memory_percent_avg: float
    memory_percent_max: float
    memory_percent_min: float
    disk_percent_avg: float
    time_window_seconds: float
