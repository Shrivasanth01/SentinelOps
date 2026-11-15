import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.monitoring.prometheus_client import PrometheusClient
from app.schemas.analytics import AnalyticsSummaryResponse, SubsystemStats, TrendDirectionEnum
from app.services.historical_analytics_service import historical_analytics_service
from app.services.monitored_service_service import monitored_service_service

logger = logging.getLogger("sentinelops.services.analytics_summary")


class AnalyticsSummaryService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_summary(self, session: AsyncSession) -> AnalyticsSummaryResponse:
        """
        Synthesizes an executive observability scorecard across all telemetry subsystems,
        service availability rates, stability scores, and notable trends.
        """
        now = datetime.now(timezone.utc)

        # 1. Gather historical stats for all subsystems concurrently (last 1 hour window)
        cpu_task = historical_analytics_service.get_cpu_history(time_range="1h")
        mem_task = historical_analytics_service.get_memory_history(time_range="1h")
        disk_task = historical_analytics_service.get_disk_history(time_range="1h")
        net_task = historical_analytics_service.get_network_history(time_range="1h")
        services_task = monitored_service_service.probe_all_services(session)

        cpu_resp, mem_resp, disk_resp, net_resp, services_resp = await asyncio.gather(
            cpu_task, mem_task, disk_task, net_task, services_task
        )

        subsystems: dict[str, SubsystemStats] = {
            "cpu": cpu_resp.stats,
            "memory": mem_resp.stats,
            "disk": disk_resp.stats,
            "network": net_resp.stats,
        }

        # 2. Identify critical trends
        critical_trends: list[str] = []
        if cpu_resp.stats.trend in (TrendDirectionEnum.SURGING, TrendDirectionEnum.INCREASING):
            rate = cpu_resp.stats.rate_of_change_percent or 0.0
            critical_trends.append(f"CPU utilization trending upward (+{rate:.1f}% across 1h window)")

        if mem_resp.stats.trend == TrendDirectionEnum.INCREASING:
            rate = mem_resp.stats.rate_of_change_percent or 0.0
            critical_trends.append(f"Memory consumption growing (+{rate:.1f}% across 1h window)")

        if disk_resp.stats.current_value and disk_resp.stats.current_value > 85.0:
            critical_trends.append(f"High disk space utilization on primary volume: {disk_resp.stats.current_value}%")

        if net_resp.stats.trend == TrendDirectionEnum.SURGING:
            critical_trends.append("Network throughput surge detected above historical baseline")

        # 3. Calculate service availability
        availability_pct = 100.0
        if services_resp.total > 0:
            availability_pct = round((services_resp.up_count / services_resp.total) * 100.0, 1)

        # 4. Calculate stability score (0-100%)
        # Penalties:
        # - High CPU (>75: -10, >90: -25)
        # - High RAM (>80: -10, >92: -25)
        # - High Disk (>85: -15, >95: -30)
        # - Service down: -15 per down service
        score = 100.0

        cpu_curr = cpu_resp.stats.current_value or 0.0
        if cpu_curr > 90.0:
            score -= 25.0
        elif cpu_curr > 75.0:
            score -= 10.0

        mem_curr = mem_resp.stats.current_value or 0.0
        if mem_curr > 92.0:
            score -= 25.0
        elif mem_curr > 80.0:
            score -= 10.0

        disk_curr = disk_resp.stats.current_value or 0.0
        if disk_curr > 95.0:
            score -= 30.0
        elif disk_curr > 85.0:
            score -= 15.0

        score -= (services_resp.down_count * 15.0)
        score = max(0.0, min(100.0, round(score, 1)))

        system_status = (
            "HEALTHY"
            if score >= 85.0
            else "ELEVATED"
            if score >= 60.0
            else "DEGRADED"
        )

        return AnalyticsSummaryResponse(
            timestamp=now,
            overall_stability_score=score,
            system_status=system_status,
            subsystems=subsystems,
            critical_trends=critical_trends,
            service_availability_percent=availability_pct,
            monitored_nodes_count=7 + services_resp.total,
        )


analytics_summary_service = AnalyticsSummaryService()

