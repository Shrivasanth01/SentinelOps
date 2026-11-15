import asyncio
import logging
import math
import statistics
from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.analytics import (
    BaselinesResponse,
    DeviationStatusEnum,
    StatisticalBaseline,
)

logger = logging.getLogger("sentinelops.services.baseline")


class BaselineService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()
        self.min_samples = settings.BASELINE_MIN_DATA_POINTS
        self.warning_z = settings.BASELINE_Z_SCORE_WARNING
        self.critical_z = settings.BASELINE_Z_SCORE_CRITICAL

    async def get_baselines(self, baseline_duration: str = "24h") -> BaselinesResponse:
        """
        Calculates statistical baselines (mean, median, stddev, min, max, rolling avg)
        and compares with current values to identify unusual surges or drops.
        """
        now = datetime.now(timezone.utc)
        end_time = now.timestamp()

        # Baseline window: e.g. past 24 hours with 5m step resolution (~288 samples)
        duration_sec = 86400 if baseline_duration == "24h" else 3600
        start_time = end_time - duration_sec
        step = "5m" if baseline_duration == "24h" else "30s"

        metrics_config = [
            {
                "key": "cpu_utilization",
                "label": "CPU Utilization",
                "unit": "%",
                "range_query": (
                    '100 - (avg(irate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100) or '
                    '100 - (avg(irate(windows_cpu_time_total{mode="idle"}[1m])) * 100)'
                ),
                "instant_query": (
                    '100 - (avg(irate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100) or '
                    '100 - (avg(irate(windows_cpu_time_total{mode="idle"}[1m])) * 100)'
                ),
            },
            {
                "key": "memory_utilization",
                "label": "Physical RAM Utilization",
                "unit": "%",
                "range_query": (
                    '((windows_memory_physical_total_bytes - windows_memory_physical_free_bytes) / '
                    'windows_memory_physical_total_bytes) * 100 or '
                    '((windows_cs_physical_memory_bytes - windows_os_physical_memory_free_bytes) / '
                    'windows_cs_physical_memory_bytes) * 100'
                ),
                "instant_query": (
                    '((windows_memory_physical_total_bytes - windows_memory_physical_free_bytes) / '
                    'windows_memory_physical_total_bytes) * 100 or '
                    '((windows_cs_physical_memory_bytes - windows_os_physical_memory_free_bytes) / '
                    'windows_cs_physical_memory_bytes) * 100'
                ),
            },
            {
                "key": "disk_utilization",
                "label": "Primary Disk C: Utilization",
                "unit": "%",
                "range_query": (
                    '100 - ((windows_logical_disk_free_bytes{volume="C:"} / windows_logical_disk_size_bytes{volume="C:"}) * 100) or '
                    '100 - ((windows_logical_disk_free_bytes{volume=~"[A-Z]:"} / windows_logical_disk_size_bytes{volume=~"[A-Z]:"}) * 100)'
                ),
                "instant_query": (
                    '100 - ((windows_logical_disk_free_bytes{volume="C:"} / windows_logical_disk_size_bytes{volume="C:"}) * 100) or '
                    '100 - ((windows_logical_disk_free_bytes{volume=~"[A-Z]:"} / windows_logical_disk_size_bytes{volume=~"[A-Z]:"}) * 100)'
                ),
            },
            {
                "key": "network_throughput",
                "label": "Network Aggregate Throughput",
                "unit": "B/s",
                "range_query": (
                    'sum(irate(windows_net_bytes_received_total[1m])) + sum(irate(windows_net_bytes_sent_total[1m])) or '
                    'sum(rate(windows_net_bytes_received_total[1m])) + sum(rate(windows_net_bytes_sent_total[1m]))'
                ),
                "instant_query": (
                    'sum(irate(windows_net_bytes_received_total[1m])) + sum(irate(windows_net_bytes_sent_total[1m])) or '
                    'sum(rate(windows_net_bytes_received_total[1m])) + sum(rate(windows_net_bytes_sent_total[1m]))'
                ),
            },
        ]

        async def compute_baseline(cfg: dict) -> StatisticalBaseline:
            key = cfg["key"]
            label = cfg["label"]
            unit = cfg["unit"]

            try:
                # 1. Fetch range samples
                range_data = await self.client.query_range(
                    expr=cfg["range_query"],
                    start=start_time,
                    end=end_time,
                    step=step,
                )

                # 2. Fetch live instant value
                instant_data = await self.client.query(expr=cfg["instant_query"])
                current_val = self.client.extract_single_value(instant_data)

                # Parse samples
                samples: list[float] = []
                results = range_data.get("result", [])
                if results and len(results) > 0:
                    for pt in results[0].get("values", []):
                        if len(pt) == 2:
                            try:
                                v = float(pt[1])
                                if not math.isnan(v):
                                    samples.append(v)
                            except (ValueError, TypeError):
                                pass

                sample_count = len(samples)

                # Check minimum data requirement
                if sample_count < self.min_samples:
                    return StatisticalBaseline(
                        metric_key=key,
                        metric_label=label,
                        unit=unit,
                        historical_mean=round(statistics.mean(samples), 2) if samples else None,
                        historical_median=round(statistics.median(samples), 2) if samples else None,
                        historical_stddev=None,
                        historical_min=round(min(samples), 2) if samples else None,
                        historical_max=round(max(samples), 2) if samples else None,
                        rolling_average=round(samples[-1], 2) if samples else None,
                        current_value=round(current_val, 2) if current_val is not None else None,
                        z_score=None,
                        delta_percent=None,
                        deviation_status=DeviationStatusEnum.INSUFFICIENT_DATA,
                        sample_count=sample_count,
                        has_sufficient_data=False,
                        deviation_message=(
                            f"Insufficient historical samples: observed {sample_count}, "
                            f"minimum {self.min_samples} required to establish statistical baseline."
                        ),
                    )

                # Compute baseline parameters
                mean_val = statistics.mean(samples)
                median_val = statistics.median(samples)
                stddev_val = statistics.stdev(samples) if sample_count > 1 else 0.0
                min_val = min(samples)
                max_val = max(samples)

                # Rolling average: last 5 points
                rolling_avg = statistics.mean(samples[-min(5, sample_count):])

                # Calculate statistical deviation for current value
                z_score: Optional[float] = None
                delta_pct: Optional[float] = None
                dev_status = DeviationStatusEnum.NOMINAL
                dev_msg: Optional[str] = None

                if current_val is not None:
                    if stddev_val > 1e-4:
                        z_score = round((current_val - mean_val) / stddev_val, 2)
                    else:
                        z_score = 0.0

                    if abs(mean_val) > 1e-4:
                        delta_pct = round(((current_val - mean_val) / mean_val) * 100.0, 2)
                    else:
                        delta_pct = 0.0

                    # Evaluate status based on z-score thresholds
                    abs_z = abs(z_score)
                    if abs_z >= self.critical_z:
                        dev_status = DeviationStatusEnum.CRITICAL_DEVIATION
                        direction = "surge" if z_score > 0 else "drop"
                        dev_msg = f"Critical {direction}: {abs_z} standard deviations from baseline (delta: {delta_pct:+}%)"
                    elif abs_z >= self.warning_z:
                        dev_status = DeviationStatusEnum.WARNING_DEVIATION
                        direction = "increase" if z_score > 0 else "decrease"
                        dev_msg = f"Elevated {direction}: {abs_z} standard deviations from baseline (delta: {delta_pct:+}%)"
                    else:
                        dev_status = DeviationStatusEnum.NOMINAL
                        dev_msg = "Operating within nominal historical baseline envelope"

                return StatisticalBaseline(
                    metric_key=key,
                    metric_label=label,
                    unit=unit,
                    historical_mean=round(mean_val, 2),
                    historical_median=round(median_val, 2),
                    historical_stddev=round(stddev_val, 2),
                    historical_min=round(min_val, 2),
                    historical_max=round(max_val, 2),
                    rolling_average=round(rolling_avg, 2),
                    current_value=round(current_val, 2) if current_val is not None else None,
                    z_score=z_score,
                    delta_percent=delta_pct,
                    deviation_status=dev_status,
                    sample_count=sample_count,
                    has_sufficient_data=True,
                    deviation_message=dev_msg,
                )

            except PrometheusError as exc:
                logger.warning(f"Error establishing baseline for {key}: {exc}")
                return StatisticalBaseline(
                    metric_key=key,
                    metric_label=label,
                    unit=unit,
                    deviation_status=DeviationStatusEnum.INSUFFICIENT_DATA,
                    sample_count=0,
                    has_sufficient_data=False,
                    deviation_message=f"Prometheus connection error: {exc}",
                )

        tasks = [compute_baseline(cfg) for cfg in metrics_config]
        baselines = await asyncio.gather(*tasks)

        deviations = sum(
            1
            for b in baselines
            if b.deviation_status in (DeviationStatusEnum.WARNING_DEVIATION, DeviationStatusEnum.CRITICAL_DEVIATION)
        )
        sufficient = sum(1 for b in baselines if b.has_sufficient_data)

        return BaselinesResponse(
            timestamp=now,
            baselines=list(baselines),
            total_metrics=len(baselines),
            deviations_detected=deviations,
            sufficient_data_count=sufficient,
        )


baseline_service = BaselineService()

