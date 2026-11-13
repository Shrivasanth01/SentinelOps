import logging
from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings
from app.monitoring.prometheus_client import PrometheusClient, PrometheusError
from app.schemas.monitoring import DiskMetricData, DiskVolumeData, HealthState

logger = logging.getLogger("sentinelops.monitoring.disk")


class DiskMonitoringService:
    def __init__(self, client: Optional[PrometheusClient] = None) -> None:
        self.client = client or PrometheusClient()

    async def get_disk_metrics(self) -> DiskMetricData:
        """
        Retrieves logical disk volume storage metrics and read/write I/O rates.
        """
        now = datetime.now(timezone.utc)
        try:
            # Query partition sizes
            size_query = 'windows_logical_disk_size_bytes{volume=~"[A-Za-z]:"}'
            size_data = await self.client.query(size_query)

            # Query partition free bytes
            free_query = 'windows_logical_disk_free_bytes{volume=~"[A-Za-z]:"}'
            free_data = await self.client.query(free_query)

            # Map free bytes by volume label
            free_map: dict[str, int] = {}
            for res in free_data.get("result", []):
                vol = res.get("metric", {}).get("volume", "")
                val_tuple = res.get("value")
                if vol and val_tuple and len(val_tuple) == 2:
                    try:
                        free_map[vol] = int(float(val_tuple[1]))
                    except (ValueError, TypeError):
                        pass

            volumes: list[DiskVolumeData] = []
            worst_volume_status = HealthState.HEALTHY if size_data.get("result") else HealthState.UNKNOWN

            for res in size_data.get("result", []):
                vol = res.get("metric", {}).get("volume", "")
                val_tuple = res.get("value")
                if not vol or not val_tuple or len(val_tuple) != 2:
                    continue

                try:
                    total_bytes = int(float(val_tuple[1]))
                except (ValueError, TypeError):
                    continue

                free_bytes = free_map.get(vol)
                used_bytes: Optional[int] = None
                percent: Optional[float] = None
                vol_status = HealthState.UNKNOWN

                if free_bytes is not None and total_bytes > 0:
                    used_bytes = max(0, total_bytes - free_bytes)
                    percent = round((used_bytes / total_bytes) * 100.0, 2)
                    if percent >= settings.DISK_CRITICAL_THRESHOLD:
                        vol_status = HealthState.CRITICAL
                    elif percent >= settings.DISK_WARNING_THRESHOLD:
                        vol_status = HealthState.WARNING
                    else:
                        vol_status = HealthState.HEALTHY

                    # Track worst state
                    if vol_status == HealthState.CRITICAL:
                        worst_volume_status = HealthState.CRITICAL
                    elif vol_status == HealthState.WARNING and worst_volume_status != HealthState.CRITICAL:
                        worst_volume_status = HealthState.WARNING

                volumes.append(
                    DiskVolumeData(
                        volume=vol,
                        total_bytes=total_bytes,
                        used_bytes=used_bytes,
                        free_bytes=free_bytes,
                        percent=percent,
                        status=vol_status,
                    )
                )

            # Sort volumes by drive letter
            volumes.sort(key=lambda v: v.volume)

            # Query read/write rates in bytes/second
            read_rate_query = (
                "sum(irate(windows_logical_disk_read_bytes_total[1m])) or "
                "sum(rate(windows_logical_disk_read_bytes_total[1m]))"
            )
            write_rate_query = (
                "sum(irate(windows_logical_disk_write_bytes_total[1m])) or "
                "sum(rate(windows_logical_disk_write_bytes_total[1m]))"
            )

            read_rate = self.client.extract_single_value(await self.client.query(read_rate_query))
            write_rate = self.client.extract_single_value(await self.client.query(write_rate_query))

            return DiskMetricData(
                volumes=volumes,
                total_read_bytes_per_sec=round(read_rate, 2) if read_rate is not None else None,
                total_write_bytes_per_sec=round(write_rate, 2) if write_rate is not None else None,
                status=worst_volume_status,
                timestamp=now,
            )
        except PrometheusError as exc:
            logger.warning(f"Error querying disk metrics from Prometheus: {exc}")
            return DiskMetricData(
                volumes=[],
                total_read_bytes_per_sec=None,
                total_write_bytes_per_sec=None,
                status=HealthState.UNKNOWN,
                timestamp=now,
            )
