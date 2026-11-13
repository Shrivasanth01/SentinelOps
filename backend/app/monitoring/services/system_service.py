import logging
import platform
from datetime import datetime, timezone
from typing import Optional
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.monitoring import SystemInfoData

logger = logging.getLogger("sentinelops.monitoring.system")


class SystemMonitoringService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_system_info(self) -> SystemInfoData:
        """
        Retrieves operating system metadata, uptime, and system process count.
        """
        now = datetime.now(timezone.utc)
        try:
            # Query OS Information
            os_data = await self.client.query("windows_os_info")
            os_name: Optional[str] = None
            os_version: Optional[str] = None
            os_build: Optional[str] = None
            hostname: Optional[str] = None

            results = os_data.get("result", [])
            if results:
                metric = results[0].get("metric", {})
                os_name = metric.get("product_type") or metric.get("name") or "Microsoft Windows"
                os_version = metric.get("version")
                os_build = metric.get("build_number")
                hostname = metric.get("instance")

            # Fallback for hostname if label is generic
            if not hostname or hostname in ("windows-host", "localhost:9182", "127.0.0.1:9182"):
                hostname = platform.node()

            if not os_name:
                os_name = f"Microsoft Windows ({platform.system()} {platform.release()})"

            # Query System Uptime & Boot Time
            uptime_query = (
                "windows_system_system_up_time or "
                "(time() - windows_system_boot_time_timestamp) or "
                "(time() - windows_os_boot_time)"
            )
            uptime_val = self.client.extract_single_value(await self.client.query(uptime_query))

            boot_time: Optional[datetime] = None
            if uptime_val is not None and uptime_val > 0:
                boot_epoch = now.timestamp() - uptime_val
                boot_time = datetime.fromtimestamp(boot_epoch, tz=timezone.utc)
            else:
                boot_data = await self.client.query(
                    "windows_system_boot_time_timestamp or windows_os_boot_time"
                )
                boot_epoch = self.client.extract_single_value(boot_data)
                if boot_epoch is not None and boot_epoch > 0:
                    boot_time = datetime.fromtimestamp(boot_epoch, tz=timezone.utc)
                    uptime_val = max(0.0, now.timestamp() - boot_epoch)

            # Query Process Count
            process_query = (
                "windows_system_processes or "
                "windows_os_processes or "
                "windows_process_info"
            )
            process_count = self.client.extract_single_value(await self.client.query(process_query))

            return SystemInfoData(
                hostname=hostname,
                os_name=os_name,
                os_version=os_version or platform.version(),
                os_build=os_build,
                uptime_seconds=round(uptime_val, 1) if uptime_val is not None else None,
                boot_time=boot_time,
                process_count=int(process_count) if process_count is not None else None,
                timestamp=now,
            )
        except PrometheusError as exc:
            logger.warning(f"Error querying system info from Prometheus: {exc}")
            return SystemInfoData(
                hostname=platform.node(),
                os_name=f"Microsoft Windows ({platform.system()})",
                os_version=platform.version(),
                os_build=None,
                uptime_seconds=None,
                boot_time=None,
                process_count=None,
                timestamp=now,
            )
