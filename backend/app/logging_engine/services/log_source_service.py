import logging
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.log_sources import LogSourceRecord
from app.logging_engine.schemas.logs import (
    LogSourceCreate,
    LogSourceResponse,
    LogSourcesListResponse,
    LogSourceTypeEnum,
    LogSourceUpdate,
)

logger = logging.getLogger("sentinelops.logging.services.source")


class LogSourceService:
    """
    Manages log source registration, persistence, and collection health in PostgreSQL.
    """

    async def seed_default_sources(self, session: AsyncSession) -> None:
        """Seeds default log sources (Windows System, Application, FastAPI) if empty."""
        stmt = select(LogSourceRecord).limit(1)
        res = await session.execute(stmt)
        if res.scalar_one_or_none() is not None:
            return

        defaults = [
            LogSourceRecord(
                name="Windows System Events",
                source_type="WINDOWS_EVENT",
                channel_or_path="System",
                description="Core Windows operating system hardware, driver, and system service events",
                format="WINDOWS_XML",
                enabled=True,
                tags="os,windows,system",
                collection_status="HEALTHY",
            ),
            LogSourceRecord(
                name="Windows Application Events",
                source_type="WINDOWS_EVENT",
                channel_or_path="Application",
                description="Host software, database, and background application service events",
                format="WINDOWS_XML",
                enabled=True,
                tags="os,windows,apps",
                collection_status="HEALTHY",
            ),
            LogSourceRecord(
                name="SentinelOps Backend Logger",
                source_type="APPLICATION_LOG",
                channel_or_path="sentinelops-api",
                description="FastAPI async application lifecycle, API requests, and audit logs",
                format="JSON",
                enabled=True,
                tags="backend,api,fastapi",
                collection_status="HEALTHY",
            ),
        ]
        session.add_all(defaults)
        await session.commit()
        logger.info("Seeded default log sources into PostgreSQL.")

    async def list_sources(self, session: AsyncSession) -> LogSourcesListResponse:
        """Retrieves all registered log sources."""
        try:
            await self.seed_default_sources(session)
            stmt = select(LogSourceRecord).order_by(LogSourceRecord.created_at.asc())
            result = await session.execute(stmt)
            records = list(result.scalars().all())
            active = sum(1 for r in records if r.enabled)
            responses = [LogSourceResponse.model_validate(r) for r in records]
            return LogSourcesListResponse(sources=responses, total=len(responses), active_count=active)
        except Exception as exc:
            logger.warning(f"Could not load log sources from database: {exc}")
            # Graceful in-memory fallback
            default_resp = [
                LogSourceResponse(
                    id="src-win-sys",
                    name="Windows System Events",
                    source_type=LogSourceTypeEnum.WINDOWS_EVENT,
                    channel_or_path="System",
                    description="Windows system channel",
                    format="WINDOWS_XML",
                    enabled=True,
                    tags="windows,system",
                    collection_status="HEALTHY",
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                ),
                LogSourceResponse(
                    id="src-api-core",
                    name="SentinelOps Backend Logger",
                    source_type=LogSourceTypeEnum.APPLICATION_LOG,
                    channel_or_path="sentinelops-api",
                    description="FastAPI core logs",
                    format="JSON",
                    enabled=True,
                    tags="backend,api",
                    collection_status="HEALTHY",
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                ),
            ]
            return LogSourcesListResponse(sources=default_resp, total=len(default_resp), active_count=len(default_resp))

    async def get_source(self, session: AsyncSession, source_id: str) -> Optional[LogSourceRecord]:
        """Retrieves a single log source by ID."""
        stmt = select(LogSourceRecord).where(LogSourceRecord.id == source_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_source(self, session: AsyncSession, data: LogSourceCreate) -> LogSourceRecord:
        """Registers a new log source."""
        record = LogSourceRecord(
            name=data.name,
            source_type=data.source_type.value,
            channel_or_path=data.channel_or_path,
            description=data.description,
            format=data.format.value,
            enabled=data.enabled,
            tags=data.tags,
            collection_status="HEALTHY",
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    async def update_source(
        self,
        session: AsyncSession,
        source_id: str,
        data: LogSourceUpdate,
    ) -> Optional[LogSourceRecord]:
        """Updates an existing log source."""
        record = await self.get_source(session, source_id)
        if not record:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for k, v in update_data.items():
            if v is not None:
                if k == "format" and hasattr(v, "value"):
                    v = v.value
                setattr(record, k, v)

        record.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(record)
        return record

    async def delete_source(self, session: AsyncSession, source_id: str) -> bool:
        """Deletes a log source."""
        record = await self.get_source(session, source_id)
        if not record:
            return False
        await session.delete(record)
        await session.commit()
        return True


log_source_service = LogSourceService()
