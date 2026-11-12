import collections
import logging
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from app.monitoring.collector import metrics_collector
from app.monitoring.prometheus import update_prometheus_metrics
from app.schemas.metrics import (
    HostMetricsSnapshot,
    MetricsHistoryResponse,
    MetricsSummaryResponse,
)
from app.models.metric_snapshot import MetricSnapshotRecord
from app.db.session import AsyncSessionLocal

logger = logging.getLogger("sentinelops.services.metrics")


class MetricsService:
    """
    Service managing metric snapshots, in-memory ring buffers for low-latency queries,
    and periodic database persistence.
    """

    def __init__(self, max_buffer_size: int = 240, sampling_interval: float = 5.0):
        # Ring buffer retaining up to 20 minutes of 5s resolution samples
        self._buffer: collections.deque[HostMetricsSnapshot] = collections.deque(maxlen=max_buffer_size)
        self.sampling_interval: float = sampling_interval

    def record_snapshot(self, snapshot: Optional[HostMetricsSnapshot] = None) -> HostMetricsSnapshot:
        """Captures a snapshot, caches it in the ring buffer, and updates Prometheus gauges."""
        if snapshot is None:
            snapshot = metrics_collector.snapshot()

        self._buffer.append(snapshot)
        update_prometheus_metrics(snapshot)
        return snapshot

    async def persist_snapshot_to_db(self, snapshot: HostMetricsSnapshot) -> None:
        """Persists a snapshot record to PostgreSQL."""
        from app.core.config import settings

        if settings.ENVIRONMENT == "testing":
            return

        try:
            async with AsyncSessionLocal() as session:
                record = MetricSnapshotRecord(
                    timestamp=snapshot.timestamp,
                    cpu_percent=snapshot.cpu.overall_percent,
                    memory_percent=snapshot.memory.percent,
                    disk_percent=snapshot.disk.partitions[0].percent if snapshot.disk.partitions else 0.0,
                    network_sent_bytes=snapshot.network.total_bytes_sent,
                    network_recv_bytes=snapshot.network.total_bytes_recv,
                    process_count=snapshot.system.process_count,
                    payload_json=snapshot.model_dump_json(),
                )
                session.add(record)
                await session.commit()
        except Exception as exc:
            logger.warning(f"Failed to persist metric snapshot to database: {exc}")

    def get_current(self) -> HostMetricsSnapshot:
        """Returns the most recent snapshot, or generates a fresh one if buffer is empty."""
        if self._buffer:
            return self._buffer[-1]
        return self.record_snapshot()

    def get_history(self, limit: int = 60) -> MetricsHistoryResponse:
        """Returns ordered historical snapshots from the circular buffer."""
        if not self._buffer:
            self.record_snapshot()

        items = list(self._buffer)
        if limit > 0:
            items = items[-limit:]

        return MetricsHistoryResponse(
            snapshots=items,
            total_count=len(items),
            sampling_interval_seconds=self.sampling_interval,
        )

    def get_summary(self, window_seconds: float = 300.0) -> MetricsSummaryResponse:
        """Computes statistical rollups over the requested time window."""
        if not self._buffer:
            self.record_snapshot()

        cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
        matching = [s for s in self._buffer if s.timestamp >= cutoff]
        if not matching:
            matching = [self._buffer[-1]]

        cpu_vals = [s.cpu.overall_percent for s in matching]
        mem_vals = [s.memory.percent for s in matching]
        disk_vals = [s.disk.partitions[0].percent for s in matching if s.disk.partitions]
        if not disk_vals:
            disk_vals = [0.0]

        return MetricsSummaryResponse(
            sample_count=len(matching),
            cpu_percent_avg=round(sum(cpu_vals) / len(cpu_vals), 2),
            cpu_percent_max=round(max(cpu_vals), 2),
            cpu_percent_min=round(min(cpu_vals), 2),
            memory_percent_avg=round(sum(mem_vals) / len(mem_vals), 2),
            memory_percent_max=round(max(mem_vals), 2),
            memory_percent_min=round(min(mem_vals), 2),
            disk_percent_avg=round(sum(disk_vals) / len(disk_vals), 2),
            time_window_seconds=window_seconds,
        )


metrics_service = MetricsService()

