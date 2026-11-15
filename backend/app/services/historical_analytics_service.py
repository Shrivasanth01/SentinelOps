import asyncio
import logging
import math
import statistics
from datetime import datetime, timezone
from typing import Optional
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.analytics import (
    HistoricalMetricPoint,
    HistoricalMetricResponse,
    SubsystemStats,
    TimeRangeEnum,
    TrendDirectionEnum,
)

logger = logging.getLogger("sentinelops.services.historical_analytics")


def parse_time_range(time_range: str) -> tuple[float, float, str]:
    """
    Translates time range string into (start_epoch, end_epoch, step_resolution).
    Supported: 15m, 1h, 6h, 24h, 7d.
    """
    now = datetime.now(timezone.utc).timestamp()
    mapping = {
        "15m": (now - 900, "15s"),
        "1h": (now - 3600, "30s"),
        "6h": (now - 21600, "2m"),
        "24h": (now - 86400, "10m"),
        "7d": (now - 604800, "1h"),
    }
    start, step = mapping.get(time_range.lower(), (now - 900, "15s"))
    return start, now, step


def calculate_subsystem_statistics(
    points: list[HistoricalMetricPoint],
    unit: str = "%",
    min_required: int = 3,
) -> SubsystemStats:
    """
    Computes rigorous statistical descriptors across historical timeseries points:
    mean, median, min, max, standard deviation, 5-sample rolling average, and trend trajectory.
    """
    valid_values = [p.value for p in points if p.value is not None and not math.isnan(p.value)]
    count = len(valid_values)

    if count < min_required:
        return SubsystemStats(
            mean=round(valid_values[0], 2) if count == 1 else None,
            median=round(valid_values[0], 2) if count == 1 else None,
            min=round(min(valid_values), 2) if count > 0 else None,
            max=round(max(valid_values), 2) if count > 0 else None,
            standard_deviation=None,
            rolling_average=round(valid_values[-1], 2) if count > 0 else None,
            current_value=round(valid_values[-1], 2) if count > 0 else None,
            trend=TrendDirectionEnum.STABLE,
            rate_of_change_percent=None,
            sample_count=count,
            has_sufficient_data=False,
            data_quality_notes=f"Sparse samples (observed {count}, minimum {min_required} required for statistics)",
        )

    mean_val = statistics.mean(valid_values)
    median_val = statistics.median(valid_values)
    min_val = min(valid_values)
    max_val = max(valid_values)
    stddev_val = statistics.stdev(valid_values) if count > 1 else 0.0

    # Rolling average of latest window (up to 5 samples)
    rolling_window = valid_values[-min(5, count):]
    rolling_avg = statistics.mean(rolling_window)
    current_val = valid_values[-1]

    # Calculate trend trajectory: slope / delta comparison between first half and second half
    half = count // 2
    first_half_avg = statistics.mean(valid_values[:half])
    second_half_avg = statistics.mean(valid_values[half:])

    delta_pct = 0.0
    if abs(first_half_avg) > 1e-6:
        delta_pct = ((second_half_avg - first_half_avg) / first_half_avg) * 100.0

    trend = TrendDirectionEnum.STABLE
    if delta_pct > 10.0:
        trend = TrendDirectionEnum.SURGING if delta_pct > 30.0 else TrendDirectionEnum.INCREASING
    elif delta_pct < -10.0:
        trend = TrendDirectionEnum.QUIET if delta_pct < -30.0 else TrendDirectionEnum.DECREASING

    return SubsystemStats(
        mean=round(mean_val, 2),
        median=round(median_val, 2),
        min=round(min_val, 2),
        max=round(max_val, 2),
        standard_deviation=round(stddev_val, 2),
        rolling_average=round(rolling_avg, 2),
        current_value=round(current_val, 2),
        trend=trend,
        rate_of_change_percent=round(delta_pct, 2),
        sample_count=count,
        has_sufficient_data=True,
        data_quality_notes=None,
    )


class HistoricalAnalyticsService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_cpu_history(self, time_range: str = "15m") -> HistoricalMetricResponse:
        """
        Historical CPU utilization metrics: overall percentage, per-core breakdown, and stats.
        """
        start, end, step = parse_time_range(time_range)

        # Overall CPU usage PromQL
        query = (
            '100 - (avg(irate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100) or '
            '100 - (avg(irate(windows_cpu_time_total{mode="idle"}[1m])) * 100) or '
            '100 - (avg(rate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100)'
        )

        user_query = (
            'avg(irate(windows_cpu_time_seconds_total{mode="user"}[1m])) * 100 or '
            'avg(irate(windows_cpu_time_total{mode="user"}[1m])) * 100'
        )

        kernel_query = (
            'avg(irate(windows_cpu_time_seconds_total{mode=~"privileged|system"}[1m])) * 100 or '
            'avg(irate(windows_cpu_time_total{mode=~"privileged|system"}[1m])) * 100'
        )

        overall_task = self._query_points(query, start, end, step)
        user_task = self._query_points(user_query, start, end, step)
        kernel_task = self._query_points(kernel_query, start, end, step)

        points, user_pts, kernel_pts = await asyncio.gather(overall_task, user_task, kernel_task)
        stats = calculate_subsystem_statistics(points, unit="%")

        return HistoricalMetricResponse(
            subsystem="cpu",
            time_range=time_range,
            start_time=start,
            end_time=end,
            step=step,
            unit="%",
            stats=stats,
            points=points,
            breakdown={"user": user_pts, "kernel": kernel_pts},
        )

    async def get_memory_history(self, time_range: str = "15m") -> HistoricalMetricResponse:
        """
        Historical physical memory utilization, used memory, and free memory trends.
        """
        start, end, step = parse_time_range(time_range)

        percent_query = (
            '((windows_memory_physical_total_bytes - windows_memory_physical_free_bytes) / '
            'windows_memory_physical_total_bytes) * 100 or '
            '((windows_cs_physical_memory_bytes - windows_os_physical_memory_free_bytes) / '
            'windows_cs_physical_memory_bytes) * 100'
        )

        used_query = (
            'windows_memory_physical_total_bytes - windows_memory_physical_free_bytes or '
            'windows_cs_physical_memory_bytes - windows_os_physical_memory_free_bytes'
        )

        free_query = (
            'windows_memory_physical_free_bytes or '
            'windows_memory_available_bytes or '
            'windows_os_physical_memory_free_bytes'
        )

        pct_task = self._query_points(percent_query, start, end, step)
        used_task = self._query_points(used_query, start, end, step)
        free_task = self._query_points(free_query, start, end, step)

        points, used_pts, free_pts = await asyncio.gather(pct_task, used_task, free_task)
        stats = calculate_subsystem_statistics(points, unit="%")

        return HistoricalMetricResponse(
            subsystem="memory",
            time_range=time_range,
            start_time=start,
            end_time=end,
            step=step,
            unit="%",
            stats=stats,
            points=points,
            breakdown={"used_bytes": used_pts, "free_bytes": free_pts},
        )

    async def get_disk_history(self, time_range: str = "15m") -> HistoricalMetricResponse:
        """
        Historical logical disk utilization %, available capacity, and disk usage growth.
        """
        start, end, step = parse_time_range(time_range)

        # Primary partition C: utilization
        percent_query = (
            '100 - ((windows_logical_disk_free_bytes{volume="C:"} / windows_logical_disk_size_bytes{volume="C:"}) * 100) or '
            '100 - ((windows_logical_disk_free_bytes{volume=~"[A-Z]:"} / windows_logical_disk_size_bytes{volume=~"[A-Z]:"}) * 100)'
        )

        free_query = 'windows_logical_disk_free_bytes{volume="C:"}'

        io_read_query = (
            'sum(irate(windows_logical_disk_read_bytes_total[1m])) or '
            'sum(rate(windows_logical_disk_read_bytes_total[1m]))'
        )

        io_write_query = (
            'sum(irate(windows_logical_disk_write_bytes_total[1m])) or '
            'sum(rate(windows_logical_disk_write_bytes_total[1m]))'
        )

        pct_task = self._query_points(percent_query, start, end, step)
        free_task = self._query_points(free_query, start, end, step)
        read_task = self._query_points(io_read_query, start, end, step)
        write_task = self._query_points(io_write_query, start, end, step)

        points, free_pts, read_pts, write_pts = await asyncio.gather(
            pct_task, free_task, read_task, write_task
        )
        stats = calculate_subsystem_statistics(points, unit="%")

        return HistoricalMetricResponse(
            subsystem="disk",
            time_range=time_range,
            start_time=start,
            end_time=end,
            step=step,
            unit="%",
            stats=stats,
            points=points,
            breakdown={
                "free_bytes": free_pts,
                "read_bytes_sec": read_pts,
                "write_bytes_sec": write_pts,
            },
        )

    async def get_network_history(self, time_range: str = "15m") -> HistoricalMetricResponse:
        """
        Historical network traffic: aggregate throughput, incoming (Rx), and outgoing (Tx).
        """
        start, end, step = parse_time_range(time_range)

        total_query = (
            'sum(irate(windows_net_bytes_received_total[1m])) + sum(irate(windows_net_bytes_sent_total[1m])) or '
            'sum(rate(windows_net_bytes_received_total[1m])) + sum(rate(windows_net_bytes_sent_total[1m]))'
        )

        rx_query = (
            'sum(irate(windows_net_bytes_received_total[1m])) or '
            'sum(rate(windows_net_bytes_received_total[1m]))'
        )

        tx_query = (
            'sum(irate(windows_net_bytes_sent_total[1m])) or '
            'sum(rate(windows_net_bytes_sent_total[1m]))'
        )

        total_task = self._query_points(total_query, start, end, step)
        rx_task = self._query_points(rx_query, start, end, step)
        tx_task = self._query_points(tx_query, start, end, step)

        points, rx_pts, tx_pts = await asyncio.gather(total_task, rx_task, tx_task)
        stats = calculate_subsystem_statistics(points, unit="B/s")

        return HistoricalMetricResponse(
            subsystem="network",
            time_range=time_range,
            start_time=start,
            end_time=end,
            step=step,
            unit="B/s",
            stats=stats,
            points=points,
            breakdown={"rx_bytes_sec": rx_pts, "tx_bytes_sec": tx_pts},
        )

    async def _query_points(
        self,
        expr: str,
        start: float,
        end: float,
        step: str,
    ) -> list[HistoricalMetricPoint]:
        """Queries Prometheus range vector and extracts sorted points."""
        try:
            data = await self.client.query_range(expr, start=start, end=end, step=step)
            results = data.get("result", [])
            if not results:
                return []

            points: list[HistoricalMetricPoint] = []
            raw_vals = results[0].get("values", [])
            for pt in raw_vals:
                if len(pt) == 2:
                    try:
                        t = float(pt[0])
                        v = round(float(pt[1]), 2)
                        points.append(HistoricalMetricPoint(timestamp=t, value=v))
                    except (ValueError, TypeError):
                        pass
            return points
        except PrometheusError as exc:
            logger.warning(f"Prometheus range query failed for '{expr}': {exc}")
            return []


historical_analytics_service = HistoricalAnalyticsService()

