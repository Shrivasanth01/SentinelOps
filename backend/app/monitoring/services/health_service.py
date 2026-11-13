import logging
from datetime import datetime, timezone
from typing import Optional
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.monitoring import (
    CpuMetricData,
    DiskMetricData,
    HealthState,
    InfrastructureHealthData,
    MemoryMetricData,
    TargetHealth,
    TargetsResponse,
    TargetStatus,
)

logger = logging.getLogger("sentinelops.monitoring.health")


class HealthMonitoringService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_targets_status(self) -> TargetsResponse:
        """
        Retrieves scraping target health from Prometheus /api/v1/targets.
        """
        try:
            data = await self.client.get_targets()
            active_targets = data.get("activeTargets", [])

            targets: list[TargetStatus] = []
            up_count = 0

            for t in active_targets:
                job_name = t.get("labels", {}).get("job", "unknown")
                scrape_url = t.get("scrapeUrl", "")
                health_str = str(t.get("health", "unknown")).lower()
                target_health = (
                    TargetHealth.UP
                    if health_str == "up"
                    else TargetHealth.DOWN
                    if health_str == "down"
                    else TargetHealth.UNKNOWN
                )
                if target_health == TargetHealth.UP:
                    up_count += 1

                last_scrape = None
                last_scrape_raw = t.get("lastScrape")
                if last_scrape_raw:
                    try:
                        last_scrape = datetime.fromisoformat(last_scrape_raw.replace("Z", "+00:00"))
                    except ValueError:
                        pass

                scrape_duration = t.get("lastScrapeDuration")
                scrape_duration_ms = (
                    round(scrape_duration * 1000, 2)
                    if isinstance(scrape_duration, (int, float))
                    else None
                )

                targets.append(
                    TargetStatus(
                        name=job_name,
                        url=scrape_url,
                        health=target_health,
                        last_scraped_at=last_scrape,
                        last_error=t.get("lastError") or None,
                        scrape_duration_ms=scrape_duration_ms,
                        labels=t.get("labels", {}),
                    )
                )

            return TargetsResponse(
                status="success",
                total_targets=len(targets),
                up_targets=up_count,
                targets=targets,
            )
        except PrometheusError as exc:
            logger.warning(f"Could not retrieve targets from Prometheus: {exc}")
            return TargetsResponse(
                status="error",
                total_targets=0,
                up_targets=0,
                targets=[],
            )

    async def evaluate_health(
        self,
        cpu: Optional[CpuMetricData] = None,
        memory: Optional[MemoryMetricData] = None,
        disk: Optional[DiskMetricData] = None,
    ) -> tuple[InfrastructureHealthData, list[TargetStatus]]:
        """
        Evaluates overall infrastructure operational status from real telemetry and target state.
        """
        now = datetime.now(timezone.utc)
        targets_resp = await self.get_targets_status()
        targets = targets_resp.targets

        prometheus_connected = await self.client.check_health()
        reasons: list[str] = []

        if not prometheus_connected:
            return InfrastructureHealthData(
                state=HealthState.UNKNOWN,
                summary=f"Prometheus server unreachable at {self.client.base_url}",
                reasons=[
                    f"Connection refused or timed out at {self.client.base_url}",
                    "Ensure Prometheus container or service is running and accessible",
                ],
                target_status=TargetHealth.UNKNOWN,
                prometheus_connected=False,
                last_checked_at=now,
            ), targets

        # Identify Windows Exporter target status
        windows_target = next(
            (t for t in targets if "windows" in t.name.lower() or "windows" in t.url.lower()),
            None,
        )
        target_state = TargetHealth.UNKNOWN
        if windows_target:
            target_state = windows_target.health
        elif targets_resp.up_targets > 0:
            target_state = TargetHealth.UP

        if target_state == TargetHealth.DOWN:
            err = windows_target.last_error if windows_target else "Target unreachable"
            reasons.append(f"Windows Exporter scrape failed: {err}")
            return InfrastructureHealthData(
                state=HealthState.CRITICAL,
                summary="Windows Exporter target is DOWN",
                reasons=reasons,
                target_status=TargetHealth.DOWN,
                prometheus_connected=True,
                last_checked_at=now,
            ), targets

        # Check telemetry thresholds
        critical_violations: list[str] = []
        warning_violations: list[str] = []

        if cpu and cpu.overall_percent is not None:
            if cpu.status == HealthState.CRITICAL:
                critical_violations.append(f"CPU utilization is critical: {cpu.overall_percent}%")
            elif cpu.status == HealthState.WARNING:
                warning_violations.append(f"CPU utilization is elevated: {cpu.overall_percent}%")

        if memory and memory.percent is not None:
            if memory.status == HealthState.CRITICAL:
                critical_violations.append(f"RAM utilization is critical: {memory.percent}%")
            elif memory.status == HealthState.WARNING:
                warning_violations.append(f"RAM utilization is elevated: {memory.percent}%")

        if disk:
            for vol in disk.volumes:
                if vol.status == HealthState.CRITICAL:
                    critical_violations.append(
                        f"Disk volume {vol.volume} usage is critical: {vol.percent}%"
                    )
                elif vol.status == HealthState.WARNING:
                    warning_violations.append(
                        f"Disk volume {vol.volume} usage is elevated: {vol.percent}%"
                    )

        if critical_violations:
            state = HealthState.CRITICAL
            summary = "Infrastructure status is CRITICAL with threshold violations"
            reasons.extend(critical_violations)
            reasons.extend(warning_violations)
        elif warning_violations:
            state = HealthState.WARNING
            summary = "Infrastructure status WARNING: elevated resource consumption detected"
            reasons.extend(warning_violations)
        elif (
            (cpu and cpu.overall_percent is not None)
            or (memory and memory.percent is not None)
            or (disk and len(disk.volumes) > 0)
        ):
            state = HealthState.HEALTHY
            summary = "All infrastructure components operating normally within thresholds"
        else:
            state = HealthState.UNKNOWN
            summary = "Telemetry data pending or insufficient samples"
            reasons.append("Waiting for Prometheus scrape intervals to register metric rates")

        return InfrastructureHealthData(
            state=state,
            summary=summary,
            reasons=reasons,
            target_status=target_state,
            prometheus_connected=True,
            last_checked_at=now,
        ), targets
