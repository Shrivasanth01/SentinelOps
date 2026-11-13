import logging
from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.monitoring import HealthState, MemoryMetricData

logger = logging.getLogger("sentinelops.monitoring.memory")


class MemoryMonitoringService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_memory_metrics(self) -> MemoryMetricData:
        """
        Retrieves host physical memory metrics from Windows Exporter via Prometheus.
        Computes total, used, free, utilization percentage, commit limit, and commits.
        """
        now = datetime.now(timezone.utc)
        try:
            # Query Total Memory Bytes
            total_query = (
                "windows_memory_physical_total_bytes or "
                "windows_cs_physical_memory_bytes or "
                "windows_os_visible_memory_bytes"
            )
            total_bytes = self.client.extract_single_value(await self.client.query(total_query))

            # Query Free / Available Memory Bytes
            free_query = (
                "windows_memory_physical_free_bytes or "
                "windows_memory_available_bytes or "
                "windows_os_physical_memory_free_bytes"
            )
            free_bytes = self.client.extract_single_value(await self.client.query(free_query))

            # Commit Limit and Committed
            commit_limit = self.client.extract_single_value(
                await self.client.query("windows_memory_commit_limit_bytes")
            )
            commit_total = self.client.extract_single_value(
                await self.client.query("windows_memory_committed_bytes")
            )

            used_bytes: Optional[int] = None
            percent: Optional[float] = None
            total_int: Optional[int] = int(total_bytes) if total_bytes is not None else None
            free_int: Optional[int] = int(free_bytes) if free_bytes is not None else None

            if total_int is not None and free_int is not None and total_int > 0:
                used_bytes = max(0, total_int - free_int)
                percent = round((used_bytes / total_int) * 100.0, 2)
            elif total_int is not None and total_int > 0:
                # If only percent can be calculated directly
                pct_query = (
                    "((windows_memory_physical_total_bytes - windows_memory_physical_free_bytes) / "
                    "windows_memory_physical_total_bytes) * 100"
                )
                pct_val = self.client.extract_single_value(await self.client.query(pct_query))
                if pct_val is not None:
                    percent = round(pct_val, 2)

            status = HealthState.UNKNOWN
            if percent is not None:
                if percent >= settings.MEMORY_CRITICAL_THRESHOLD:
                    status = HealthState.CRITICAL
                elif percent >= settings.MEMORY_WARNING_THRESHOLD:
                    status = HealthState.WARNING
                else:
                    status = HealthState.HEALTHY

            return MemoryMetricData(
                total_bytes=total_int,
                used_bytes=used_bytes,
                free_bytes=free_int,
                percent=percent,
                commit_limit_bytes=int(commit_limit) if commit_limit is not None else None,
                commit_total_bytes=int(commit_total) if commit_total is not None else None,
                status=status,
                timestamp=now,
            )
        except PrometheusError as exc:
            logger.warning(f"Error querying memory metrics from Prometheus: {exc}")
            return MemoryMetricData(
                total_bytes=None,
                used_bytes=None,
                free_bytes=None,
                percent=None,
                status=HealthState.UNKNOWN,
                timestamp=now,
            )
