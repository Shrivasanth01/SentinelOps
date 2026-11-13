import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from app.monitoring.prometheus_client import PrometheusClient
from app.monitoring.services.cpu_service import CpuMonitoringService
from app.monitoring.services.disk_service import DiskMonitoringService
from app.monitoring.services.health_service import HealthMonitoringService
from app.monitoring.services.memory_service import MemoryMonitoringService
from app.monitoring.services.network_service import NetworkMonitoringService
from app.monitoring.services.system_service import SystemMonitoringService
from app.schemas.monitoring import MonitoringOverviewResponse

logger = logging.getLogger("sentinelops.monitoring.overview")


class OverviewMonitoringService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()
        self.cpu_service = CpuMonitoringService(self.client)
        self.memory_service = MemoryMonitoringService(self.client)
        self.disk_service = DiskMonitoringService(self.client)
        self.network_service = NetworkMonitoringService(self.client)
        self.system_service = SystemMonitoringService(self.client)
        self.health_service = HealthMonitoringService(self.client)

    async def get_overview(self) -> MonitoringOverviewResponse:
        """
        Gathers and synthesizes a complete snapshot of host infrastructure metrics and health.
        Executes sub-service queries concurrently using asyncio.gather.
        """
        now = datetime.now(timezone.utc)

        # Run component metric queries concurrently
        cpu_task = self.cpu_service.get_cpu_metrics()
        memory_task = self.memory_service.get_memory_metrics()
        disk_task = self.disk_service.get_disk_metrics()
        network_task = self.network_service.get_network_metrics()
        system_task = self.system_service.get_system_info()

        cpu, memory, disk, network, system = await asyncio.gather(
            cpu_task, memory_task, disk_task, network_task, system_task
        )

        # Evaluate health and targets based on telemetry snapshot
        health, targets = await self.health_service.evaluate_health(
            cpu=cpu,
            memory=memory,
            disk=disk,
        )

        return MonitoringOverviewResponse(
            timestamp=now,
            health=health,
            cpu=cpu,
            memory=memory,
            disk=disk,
            network=network,
            system=system,
            targets=targets,
        )
