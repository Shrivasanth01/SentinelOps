import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.monitoring import HistoryMetricsResponse, HistoryPoint, HistorySeries

logger = logging.getLogger("sentinelops.monitoring.history")


def parse_duration_to_seconds(duration: str) -> int:
    """Parses duration string like '15m', '1h', '6h', '24h', '30s' into seconds."""
    match = re.match(r"^(\d+)([smhd])$", duration.strip().lower())
    if not match:
        return 900  # Default 15 minutes
    val, unit = int(match.group(1)), match.group(2)
    multipliers = {"s": 1, "m": 60, "h": 3600, "d": 86400}
    return val * multipliers.get(unit, 60)


class HistoryMonitoringService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_history(
        self,
        metrics: Optional[list[str]] = None,
        duration: str = "15m",
        step: str = "15s",
    ) -> HistoryMetricsResponse:
        """
        Retrieves historical telemetry timeseries points for CPU, memory, disk, and network.
        """
        now = datetime.now(timezone.utc)
        end_time = now.timestamp()
        duration_sec = parse_duration_to_seconds(duration)
        start_time = end_time - duration_sec

        selected_metrics = metrics or ["cpu", "memory", "disk", "network"]
        series_list: list[HistorySeries] = []

        query_map = {
            "cpu": (
                '100 - (avg(irate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100) or '
                '100 - (avg(irate(windows_cpu_time_total{mode="idle"}[1m])) * 100)',
                "CPU Utilization",
                "%",
            ),
            "memory": (
                '((windows_memory_physical_total_bytes - windows_memory_physical_free_bytes) / '
                'windows_memory_physical_total_bytes) * 100 or '
                '((windows_cs_physical_memory_bytes - windows_os_physical_memory_free_bytes) / '
                'windows_cs_physical_memory_bytes) * 100',
                "RAM Utilization",
                "%",
            ),
            "disk": (
                '100 - ((windows_logical_disk_free_bytes{volume="C:"} / windows_logical_disk_size_bytes{volume="C:"}) * 100) or '
                '100 - ((windows_logical_disk_free_bytes{volume=~"[A-Z]:"} / windows_logical_disk_size_bytes{volume=~"[A-Z]:"}) * 100)',
                "C: Disk Space Utilization",
                "%",
            ),
            "network": (
                'sum(irate(windows_net_bytes_received_total[1m])) + sum(irate(windows_net_bytes_sent_total[1m])) or '
                'sum(rate(windows_net_bytes_received_total[1m])) + sum(rate(windows_net_bytes_sent_total[1m]))',
                "Network Aggregate Throughput",
                "B/s",
            ),
        }

        async def fetch_series(m_key: str) -> HistorySeries:
            expr, label, unit = query_map[m_key]
            try:
                data = await self.client.query_range(
                    expr=expr,
                    start=start_time,
                    end=end_time,
                    step=step,
                )
                results = data.get("result", [])
                points: list[HistoryPoint] = []
                if results and len(results) > 0:
                    raw_values = results[0].get("values", [])
                    for pt in raw_values:
                        if len(pt) == 2:
                            try:
                                t = float(pt[0])
                                v = round(float(pt[1]), 2)
                                points.append(HistoryPoint(timestamp=t, value=v))
                            except (ValueError, TypeError):
                                pass

                return HistorySeries(
                    metric=m_key,
                    label=label,
                    unit=unit,
                    points=points,
                )
            except PrometheusError as exc:
                logger.warning(f"Error querying range history for {m_key}: {exc}")
                return HistorySeries(
                    metric=m_key,
                    label=label,
                    unit=unit,
                    points=[],
                )

        tasks = [fetch_series(m) for m in selected_metrics if m in query_map]
        series_list = await asyncio.gather(*tasks)

        return HistoryMetricsResponse(
            series=series_list,
            start=start_time,
            end=end_time,
            step=step,
        )
