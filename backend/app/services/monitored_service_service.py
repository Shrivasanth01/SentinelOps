import asyncio
import logging
import ssl
import time
from datetime import datetime, timezone
from typing import Optional
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.services import MonitoredServiceRecord
from app.schemas.services import (
    MonitoredServiceCreate,
    MonitoredServiceResponse,
    MonitoredServiceUpdate,
    ServiceAvailabilityStatus,
    ServicesListResponse,
)

logger = logging.getLogger("sentinelops.services.monitored_service")


class MonitoredServiceService:
    def __init__(self, blackbox_url: Optional[str] = None) -> None:
        self.blackbox_url = (blackbox_url or settings.BLACKBOX_EXPORTER_URL).rstrip("/")
        self.timeout = settings.BLACKBOX_TIMEOUT_SECONDS

    async def list_services(
        self,
        session: AsyncSession,
        skip: int = 0,
        limit: int = 100,
    ) -> list[MonitoredServiceRecord]:
        """Fetches stored monitored service targets from PostgreSQL."""
        stmt = (
            select(MonitoredServiceRecord)
            .order_by(MonitoredServiceRecord.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_service(
        self,
        session: AsyncSession,
        service_id: str,
    ) -> Optional[MonitoredServiceRecord]:
        """Retrieves a single target by UUID."""
        stmt = select(MonitoredServiceRecord).where(MonitoredServiceRecord.id == service_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_service(
        self,
        session: AsyncSession,
        data: MonitoredServiceCreate,
    ) -> MonitoredServiceRecord:
        """Stores a new monitoring target in PostgreSQL."""
        record = MonitoredServiceRecord(
            name=data.name,
            target_url=data.target_url,
            protocol=data.protocol.value,
            probe_module=data.probe_module.value,
            expected_status_code=data.expected_status_code,
            probe_interval_seconds=data.probe_interval_seconds,
            timeout_seconds=data.timeout_seconds,
            enabled=data.enabled,
            description=data.description,
            tags=data.tags,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def update_service(
        self,
        session: AsyncSession,
        service_id: str,
        data: MonitoredServiceUpdate,
    ) -> Optional[MonitoredServiceRecord]:
        """Updates an existing target's parameters."""
        record = await self.get_service(session, service_id)
        if not record:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            if val is not None:
                if key == "protocol" and hasattr(val, "value"):
                    val = val.value
                elif key == "probe_module" and hasattr(val, "value"):
                    val = val.value
                setattr(record, key, val)

        record.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(record)
        return record

    async def delete_service(
        self,
        session: AsyncSession,
        service_id: str,
    ) -> bool:
        """Deletes a target configuration."""
        record = await self.get_service(session, service_id)
        if not record:
            return False
        await session.delete(record)
        await session.commit()
        return True

    async def probe_target(self, record: MonitoredServiceRecord) -> MonitoredServiceResponse:
        """
        Executes a real availability probe against the configured target.
        Tries Blackbox Exporter first; if unreachable, falls back to direct native probe.
        Never fabricates results.
        """
        now = datetime.now(timezone.utc)
        if not record.enabled:
            return MonitoredServiceResponse(
                id=record.id,
                name=record.name,
                target_url=record.target_url,
                protocol=record.protocol,
                probe_module=record.probe_module,
                expected_status_code=record.expected_status_code,
                probe_interval_seconds=record.probe_interval_seconds,
                timeout_seconds=record.timeout_seconds,
                enabled=record.enabled,
                description=record.description,
                tags=record.tags,
                created_at=record.created_at,
                updated_at=record.updated_at,
                availability_status=ServiceAvailabilityStatus.UNKNOWN,
                last_error="Monitoring target is paused/disabled",
            )

        # 1. Attempt Blackbox Exporter Probe
        try:
            probe_url = (
                f"{self.blackbox_url}/probe"
                f"?target={record.target_url}"
                f"&module={record.probe_module}"
            )
            async with httpx.AsyncClient(timeout=record.timeout_seconds + 1.0) as client:
                resp = await client.get(probe_url)
                if resp.status_code == 200:
                    text = resp.text
                    success = "probe_success 1" in text
                    duration_ms: Optional[float] = None
                    status_code: Optional[int] = None
                    tls_days: Optional[float] = None

                    # Extract duration
                    for line in text.splitlines():
                        if line.startswith("probe_duration_seconds "):
                            parts = line.split()
                            if len(parts) >= 2:
                                try:
                                    duration_ms = round(float(parts[1]) * 1000.0, 2)
                                except ValueError:
                                    pass
                        elif line.startswith("probe_http_status_code "):
                            parts = line.split()
                            if len(parts) >= 2:
                                try:
                                    status_code = int(float(parts[1]))
                                except ValueError:
                                    pass
                        elif line.startswith("probe_ssl_earliest_cert_expiry "):
                            parts = line.split()
                            if len(parts) >= 2:
                                try:
                                    exp_epoch = float(parts[1])
                                    if exp_epoch > 0:
                                        diff_sec = exp_epoch - now.timestamp()
                                        tls_days = round(diff_sec / 86400.0, 1)
                                except ValueError:
                                    pass

                    # Evaluate availability against expected status code
                    is_expected = True
                    if status_code is not None and record.protocol.upper() in ("HTTP", "HTTPS"):
                        is_expected = (status_code == record.expected_status_code)

                    availability = (
                        ServiceAvailabilityStatus.UP
                        if (success and is_expected)
                        else ServiceAvailabilityStatus.DEGRADED
                        if success and not is_expected
                        else ServiceAvailabilityStatus.DOWN
                    )

                    return MonitoredServiceResponse(
                        id=record.id,
                        name=record.name,
                        target_url=record.target_url,
                        protocol=record.protocol,
                        probe_module=record.probe_module,
                        expected_status_code=record.expected_status_code,
                        probe_interval_seconds=record.probe_interval_seconds,
                        timeout_seconds=record.timeout_seconds,
                        enabled=record.enabled,
                        description=record.description,
                        tags=record.tags,
                        created_at=record.created_at,
                        updated_at=record.updated_at,
                        availability_status=availability,
                        response_time_ms=duration_ms,
                        http_status_code=status_code,
                        probe_duration_ms=duration_ms,
                        tls_cert_expiry_days=tls_days,
                        last_successful_check=now if availability == ServiceAvailabilityStatus.UP else None,
                        last_error=None if availability == ServiceAvailabilityStatus.UP else f"Status {status_code} != expected {record.expected_status_code}" if success else "Probe check failed",
                    )
        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.debug(f"Blackbox Exporter probe failed at {self.blackbox_url}, falling back to direct probe: {exc}")

        # 2. Resilient Direct Probe Fallback (Real measurements, no fabrication)
        return await self._direct_probe_fallback(record, now)

    async def _direct_probe_fallback(
        self,
        record: MonitoredServiceRecord,
        now: datetime,
    ) -> MonitoredServiceResponse:
        """Direct probe executed when Blackbox Exporter is unreachable."""
        proto = record.protocol.upper()
        start = time.perf_counter()

        if proto in ("HTTP", "HTTPS"):
            try:
                async with httpx.AsyncClient(
                    verify=False,
                    timeout=record.timeout_seconds,
                    follow_redirects=True,
                ) as client:
                    resp = await client.get(record.target_url)
                    elapsed_ms = round((time.perf_counter() - start) * 1000.0, 2)
                    is_expected = (resp.status_code == record.expected_status_code)

                    availability = (
                        ServiceAvailabilityStatus.UP
                        if is_expected
                        else ServiceAvailabilityStatus.DEGRADED
                    )

                    return MonitoredServiceResponse(
                        id=record.id,
                        name=record.name,
                        target_url=record.target_url,
                        protocol=record.protocol,
                        probe_module=record.probe_module,
                        expected_status_code=record.expected_status_code,
                        probe_interval_seconds=record.probe_interval_seconds,
                        timeout_seconds=record.timeout_seconds,
                        enabled=record.enabled,
                        description=record.description,
                        tags=record.tags,
                        created_at=record.created_at,
                        updated_at=record.updated_at,
                        availability_status=availability,
                        response_time_ms=elapsed_ms,
                        http_status_code=resp.status_code,
                        probe_duration_ms=elapsed_ms,
                        last_successful_check=now if is_expected else None,
                        last_error=None if is_expected else f"HTTP {resp.status_code} received, expected {record.expected_status_code}",
                    )
            except Exception as exc:
                elapsed_ms = round((time.perf_counter() - start) * 1000.0, 2)
                return MonitoredServiceResponse(
                    id=record.id,
                    name=record.name,
                    target_url=record.target_url,
                    protocol=record.protocol,
                    probe_module=record.probe_module,
                    expected_status_code=record.expected_status_code,
                    probe_interval_seconds=record.probe_interval_seconds,
                    timeout_seconds=record.timeout_seconds,
                    enabled=record.enabled,
                    description=record.description,
                    tags=record.tags,
                    created_at=record.created_at,
                    updated_at=record.updated_at,
                    availability_status=ServiceAvailabilityStatus.DOWN,
                    response_time_ms=elapsed_ms,
                    probe_duration_ms=elapsed_ms,
                    last_error=str(exc),
                )
        elif proto == "TCP":
            # TCP Connect probe
            host_port = record.target_url.replace("tcp://", "")
            host, port_str = host_port.split(":")
            port = int(port_str)
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(host, port),
                    timeout=record.timeout_seconds,
                )
                elapsed_ms = round((time.perf_counter() - start) * 1000.0, 2)
                writer.close()
                await writer.wait_closed()
                return MonitoredServiceResponse(
                    id=record.id,
                    name=record.name,
                    target_url=record.target_url,
                    protocol=record.protocol,
                    probe_module=record.probe_module,
                    expected_status_code=record.expected_status_code,
                    probe_interval_seconds=record.probe_interval_seconds,
                    timeout_seconds=record.timeout_seconds,
                    enabled=record.enabled,
                    description=record.description,
                    tags=record.tags,
                    created_at=record.created_at,
                    updated_at=record.updated_at,
                    availability_status=ServiceAvailabilityStatus.UP,
                    response_time_ms=elapsed_ms,
                    probe_duration_ms=elapsed_ms,
                    last_successful_check=now,
                )
            except Exception as exc:
                elapsed_ms = round((time.perf_counter() - start) * 1000.0, 2)
                return MonitoredServiceResponse(
                    id=record.id,
                    name=record.name,
                    target_url=record.target_url,
                    protocol=record.protocol,
                    probe_module=record.probe_module,
                    expected_status_code=record.expected_status_code,
                    probe_interval_seconds=record.probe_interval_seconds,
                    timeout_seconds=record.timeout_seconds,
                    enabled=record.enabled,
                    description=record.description,
                    tags=record.tags,
                    created_at=record.created_at,
                    updated_at=record.updated_at,
                    availability_status=ServiceAvailabilityStatus.DOWN,
                    response_time_ms=elapsed_ms,
                    probe_duration_ms=elapsed_ms,
                    last_error=f"TCP connection failed: {exc}",
                )

        return MonitoredServiceResponse(
            id=record.id,
            name=record.name,
            target_url=record.target_url,
            protocol=record.protocol,
            probe_module=record.probe_module,
            expected_status_code=record.expected_status_code,
            probe_interval_seconds=record.probe_interval_seconds,
            timeout_seconds=record.timeout_seconds,
            enabled=record.enabled,
            description=record.description,
            tags=record.tags,
            created_at=record.created_at,
            updated_at=record.updated_at,
            availability_status=ServiceAvailabilityStatus.UNKNOWN,
            last_error="Unsupported probe protocol",
        )

    async def probe_all_services(
        self,
        session: AsyncSession,
    ) -> ServicesListResponse:
        """Probes all configured services concurrently."""
        try:
            services = await self.list_services(session, limit=200)
        except Exception as exc:
            logger.warning(f"Could not load monitored services from database: {exc}")
            services = []

        tasks = [self.probe_target(s) for s in services]
        results = await asyncio.gather(*tasks) if tasks else []

        active = sum(1 for s in results if s.enabled)
        up = sum(1 for s in results if s.availability_status == ServiceAvailabilityStatus.UP)
        down = sum(1 for s in results if s.availability_status == ServiceAvailabilityStatus.DOWN)

        return ServicesListResponse(
            total=len(results),
            active_count=active,
            up_count=up,
            down_count=down,
            services=list(results),
        )


monitored_service_service = MonitoredServiceService()
