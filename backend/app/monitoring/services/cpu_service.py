import logging
from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.monitoring import CpuMetricData, HealthState

logger = logging.getLogger("sentinelops.monitoring.cpu")


class CpuMonitoringService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_cpu_metrics(self) -> CpuMetricData:
        """
        Retrieves real-time CPU telemetry from Windows Exporter via Prometheus.
        Queries overall utilization, core breakdown, user/system/idle/interrupt breakdown.
        """
        now = datetime.now(timezone.utc)
        try:
            # Query overall CPU percent
            # Supports both modern windows_cpu_time_seconds_total and legacy windows_cpu_time_total
            overall_query = (
                '100 - (avg(irate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100)'
            )
            data = await self.client.query(overall_query)
            overall_val = self.client.extract_single_value(data)

            # Fallback for systems using rate or legacy metric names
            if overall_val is None:
                fallback_query = (
                    '100 - (avg(irate(windows_cpu_time_total{mode="idle"}[1m])) * 100) or '
                    '100 - (avg(rate(windows_cpu_time_seconds_total{mode="idle"}[1m])) * 100)'
                )
                fb_data = await self.client.query(fallback_query)
                overall_val = self.client.extract_single_value(fb_data)

            # Clamp between 0.0 and 100.0 if not None
            if overall_val is not None:
                overall_val = round(max(0.0, min(100.0, overall_val)), 2)

            # Query per-core utilization
            cores_query = (
                '100 - (irate(windows_cpu_time_seconds_total{mode="idle"}[1m]) * 100) or '
                '100 - (irate(windows_cpu_time_total{mode="idle"}[1m]) * 100)'
            )
            cores_data = await self.client.query(cores_query)
            cores_list: list[float] = []
            core_results = cores_data.get("result", [])
            for res in sorted(
                core_results,
                key=lambda x: int(x.get("metric", {}).get("core", 0))
                if x.get("metric", {}).get("core", "").isdigit()
                else 0,
            ):
                val_tuple = res.get("value")
                if val_tuple and len(val_tuple) == 2:
                    try:
                        v = round(max(0.0, min(100.0, float(val_tuple[1]))), 2)
                        cores_list.append(v)
                    except (ValueError, TypeError):
                        pass

            # Query mode breakdown: user, system/privileged, interrupt, dpc
            user_val = self.client.extract_single_value(
                await self.client.query(
                    'avg(irate(windows_cpu_time_seconds_total{mode="user"}[1m])) * 100 or '
                    'avg(irate(windows_cpu_time_total{mode="user"}[1m])) * 100'
                )
            )
            system_val = self.client.extract_single_value(
                await self.client.query(
                    'avg(irate(windows_cpu_time_seconds_total{mode=~"privileged|system"}[1m])) * 100 or '
                    'avg(irate(windows_cpu_time_total{mode=~"privileged|system"}[1m])) * 100'
                )
            )
            interrupt_val = self.client.extract_single_value(
                await self.client.query(
                    'avg(irate(windows_cpu_time_seconds_total{mode="interrupt"}[1m])) * 100 or '
                    'avg(irate(windows_cpu_time_total{mode="interrupt"}[1m])) * 100'
                )
            )
            dpc_val = self.client.extract_single_value(
                await self.client.query(
                    'avg(irate(windows_cpu_time_seconds_total{mode="dpc"}[1m])) * 100 or '
                    'avg(irate(windows_cpu_time_total{mode="dpc"}[1m])) * 100'
                )
            )

            idle_val = (
                round(100.0 - overall_val, 2)
                if overall_val is not None
                else None
            )

            # Determine Health Status
            status = HealthState.UNKNOWN
            if overall_val is not None:
                if overall_val >= settings.CPU_CRITICAL_THRESHOLD:
                    status = HealthState.CRITICAL
                elif overall_val >= settings.CPU_WARNING_THRESHOLD:
                    status = HealthState.WARNING
                else:
                    status = HealthState.HEALTHY

            return CpuMetricData(
                overall_percent=overall_val,
                core_count=len(cores_list) if cores_list else None,
                cores=cores_list,
                user_percent=round(user_val, 2) if user_val is not None else None,
                system_percent=round(system_val, 2) if system_val is not None else None,
                idle_percent=idle_val,
                interrupt_percent=round(interrupt_val, 2) if interrupt_val is not None else None,
                dpc_percent=round(dpc_val, 2) if dpc_val is not None else None,
                status=status,
                timestamp=now,
            )
        except PrometheusError as exc:
            logger.warning(f"Error querying CPU metrics from Prometheus: {exc}")
            return CpuMetricData(
                overall_percent=None,
                core_count=None,
                cores=[],
                status=HealthState.UNKNOWN,
                timestamp=now,
            )
