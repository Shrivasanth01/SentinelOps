import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.ml.config import BASE_FEATURES

logger = logging.getLogger("sentinelops.ml.data.collector")

# PromQL historical range queries for Windows Exporter
PROMETHEUS_QUERIES: Dict[str, str] = {
    "cpu_usage_percent": (
        '100 - (avg(irate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100) or '
        '100 - (avg(irate(windows_cpu_time_total{mode="idle"}[1m])) * 100) or '
        '100 - (avg(rate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100)'
    ),
    "memory_usage_percent": (
        '((windows_memory_physical_total_bytes - windows_memory_physical_free_bytes) / '
        'windows_memory_physical_total_bytes) * 100 or '
        '((windows_cs_physical_memory_bytes - windows_os_physical_memory_free_bytes) / '
        'windows_cs_physical_memory_bytes) * 100'
    ),
    "disk_usage_percent": (
        '100 - ((windows_logical_disk_free_bytes{volume="C:"} / windows_logical_disk_size_bytes{volume="C:"}) * 100) or '
        '100 - ((windows_logical_disk_free_bytes{volume=~"[A-Z]:"} / windows_logical_disk_size_bytes{volume=~"[A-Z]:"}) * 100)'
    ),
    "network_receive_bytes_per_second": (
        'sum(irate(windows_net_bytes_received_total[1m])) or '
        'sum(rate(windows_net_bytes_received_total[1m])) or '
        'sum(irate(windows_net_bytes_recv_total[1m]))'
    ),
    "network_transmit_bytes_per_second": (
        'sum(irate(windows_net_bytes_sent_total[1m])) or '
        'sum(rate(windows_net_bytes_sent_total[1m])) or '
        'sum(irate(windows_net_bytes_transmitted_total[1m]))'
    ),
}


def parse_time_range_window(time_range: str) -> Tuple[float, float, str]:
    """Translates time range string into (start_epoch, end_epoch, step_resolution)."""
    now = datetime.now(timezone.utc).timestamp()
    mapping = {
        "15m": (now - 900, "15s"),
        "1h": (now - 3600, "30s"),
        "6h": (now - 21600, "2m"),
        "24h": (now - 86400, "5m"),
        "7d": (now - 604800, "30m"),
    }
    start, step = mapping.get(time_range.lower(), (now - 3600, "30s"))
    return start, now, step


class TelemetryDataCollector:
    """
    Collects, extracts, and aligns real multi-dimensional infrastructure
    telemetry from Prometheus over specified historical windows.
    """

    def __init__(self, client: Optional[PrometheusClient] = None):
        self.client = client or PrometheusClient()

    async def _query_single_metric(
        self,
        name: str,
        query: str,
        start: float,
        end: float,
        step: str,
    ) -> List[Tuple[float, float]]:
        """Queries range for a single PromQL expression and returns (timestamp, value) tuples."""
        try:
            data = await self.client.query_range(expr=query, start=start, end=end, step=step)
            results = data.get("result", [])
            if not results:
                logger.debug(f"Prometheus query for {name} returned empty result.")
                return []

            # Extract [epoch, string_val] from primary series
            values = results[0].get("values", [])
            points = []
            for ts, val in values:
                try:
                    fval = float(val)
                    if not (pd.isna(fval) or pd.isnull(fval)):
                        points.append((float(ts), fval))
                except (ValueError, TypeError):
                    continue
            return points
        except PrometheusError as exc:
            logger.warning(f"Failed to query {name} from Prometheus: {exc}")
            return []

    async def collect_historical_dataset(
        self,
        time_range: str = "1h",
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Executes concurrent range queries across all base telemetry features,
        aligns timestamps, and returns a synchronized pandas DataFrame.
        """
        start, end, step = parse_time_range_window(time_range)
        tasks = [
            self._query_single_metric(feature_name, query, start, end, step)
            for feature_name, query in PROMETHEUS_QUERIES.items()
        ]

        results = await asyncio.gather(*tasks)

        series_dict: Dict[str, pd.Series] = {}
        for feature_name, points in zip(PROMETHEUS_QUERIES.keys(), results):
            if points:
                timestamps = [datetime.fromtimestamp(p[0], timezone.utc) for p in points]
                vals = [p[1] for p in points]
                # Round to nearest second to align slightly misaligned scrapes
                s = pd.Series(vals, index=pd.to_datetime(timestamps).round("1s"), name=feature_name)
                # Drop duplicate timestamps if any
                s = s[~s.index.duplicated(keep="last")]
                series_dict[feature_name] = s
            else:
                series_dict[feature_name] = pd.Series(dtype=float, name=feature_name)

        metadata = {
            "time_range": time_range,
            "start_time": datetime.fromtimestamp(start, timezone.utc),
            "end_time": datetime.fromtimestamp(end, timezone.utc),
            "step": step,
            "queries": PROMETHEUS_QUERIES,
        }

        if not any(len(s) > 0 for s in series_dict.values()):
            return pd.DataFrame(), metadata

        # Outer join to align all series on common timestamp index
        df = pd.DataFrame(series_dict)
        df.sort_index(inplace=True)

        return df, metadata
