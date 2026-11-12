import logging
from prometheus_client import CollectorRegistry, Gauge, generate_latest, CONTENT_TYPE_LATEST
from app.schemas.metrics import HostMetricsSnapshot

logger = logging.getLogger("sentinelops.prometheus")

# Dedicated registry for SentinelOps
sentinel_registry = CollectorRegistry(auto_describe=True)

# Define Gauges
CPU_UTILIZATION = Gauge(
    "sentinelops_cpu_utilization_percent",
    "Current overall CPU utilization percentage",
    ["host"],
    registry=sentinel_registry,
)

CPU_CORE_UTILIZATION = Gauge(
    "sentinelops_cpu_core_utilization_percent",
    "Per-core CPU utilization percentage",
    ["host", "core"],
    registry=sentinel_registry,
)

MEMORY_UTILIZATION = Gauge(
    "sentinelops_memory_utilization_percent",
    "Current RAM utilization percentage",
    ["host"],
    registry=sentinel_registry,
)

MEMORY_USED_BYTES = Gauge(
    "sentinelops_memory_used_bytes",
    "Total used physical memory in bytes",
    ["host"],
    registry=sentinel_registry,
)

MEMORY_TOTAL_BYTES = Gauge(
    "sentinelops_memory_total_bytes",
    "Total physical memory in bytes",
    ["host"],
    registry=sentinel_registry,
)

DISK_UTILIZATION = Gauge(
    "sentinelops_disk_utilization_percent",
    "Disk partition space utilization percentage",
    ["host", "mountpoint"],
    registry=sentinel_registry,
)

NETWORK_TX_BYTES = Gauge(
    "sentinelops_network_tx_bytes_total",
    "Total network transmitted bytes",
    ["host", "interface"],
    registry=sentinel_registry,
)

NETWORK_RX_BYTES = Gauge(
    "sentinelops_network_rx_bytes_total",
    "Total network received bytes",
    ["host", "interface"],
    registry=sentinel_registry,
)

PROCESS_COUNT = Gauge(
    "sentinelops_process_count",
    "Active running processes count",
    ["host"],
    registry=sentinel_registry,
)


def update_prometheus_metrics(snapshot: HostMetricsSnapshot) -> None:
    """Updates Prometheus gauges from an incoming HostMetricsSnapshot."""
    host = snapshot.host_name

    CPU_UTILIZATION.labels(host=host).set(snapshot.cpu.overall_percent)
    for idx, core_pct in enumerate(snapshot.cpu.per_cpu_percent):
        CPU_CORE_UTILIZATION.labels(host=host, core=str(idx)).set(core_pct)

    MEMORY_UTILIZATION.labels(host=host).set(snapshot.memory.percent)
    MEMORY_USED_BYTES.labels(host=host).set(snapshot.memory.used_bytes)
    MEMORY_TOTAL_BYTES.labels(host=host).set(snapshot.memory.total_bytes)

    for part in snapshot.disk.partitions:
        DISK_UTILIZATION.labels(host=host, mountpoint=part.mountpoint).set(part.percent)

    for iface in snapshot.network.interfaces:
        NETWORK_TX_BYTES.labels(host=host, interface=iface.interface).set(iface.bytes_sent)
        NETWORK_RX_BYTES.labels(host=host, interface=iface.interface).set(iface.bytes_recv)

    PROCESS_COUNT.labels(host=host).set(snapshot.system.process_count)


def get_prometheus_output() -> tuple[bytes, str]:
    """Generates serialized Prometheus scrape content and content-type."""
    return generate_latest(sentinel_registry), CONTENT_TYPE_LATEST
