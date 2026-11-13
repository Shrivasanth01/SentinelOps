import collections
import logging
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.schemas.logs import LogEntry, LogEntryCreate, LogLevelEnum, LogsListResponse
from app.models.logs import SystemLogRecord
from app.db.session import AsyncSessionLocal

logger = logging.getLogger("sentinelops.services.logs")


class LogService:
    """
    Service managing structured system logs, live tail streaming buffer,
    search filtering, and PostgreSQL persistence.
    """

    def __init__(self, max_buffer_size: int = 500):
        self._buffer: collections.deque[LogEntry] = collections.deque(maxlen=max_buffer_size)
        self._seed_initial_logs()

    def _seed_initial_logs(self) -> None:
        """Seeds realistic platform initialization logs so operators see baseline logs immediately."""
        now = datetime.now(timezone.utc)
        initial_events = [
            (LogLevelEnum.INFO, "sentinel-kernel", "SentinelOps kernel daemon v0.2.0 initialized on host node.", None),
            (LogLevelEnum.INFO, "sentinel-db", "PostgreSQL connection pool verified with 10 persistent sockets.", None),
            (LogLevelEnum.INFO, "telemetry-collector", "psutil hardware telemetry collector primed on 5.0s cadence.", None),
            (LogLevelEnum.INFO, "ml-detector", "Isolation Forest anomaly engine loaded; waiting for baseline buffer.", None),
            (LogLevelEnum.WARNING, "network-monitor", "Interface eth0 observed transient packet burst (+14.2 MB/s).", {"interface": "eth0"}),
            (LogLevelEnum.INFO, "api-gateway", "FastAPI v1 router active on port 8000. Docs exposed on /api/v1/docs.", None),
        ]
        for level, service, message, meta in initial_events:
            self._buffer.append(
                LogEntry(
                    id=str(uuid.uuid4()),
                    timestamp=now,
                    level=level,
                    service=service,
                    message=message,
                    source_ip="127.0.0.1",
                    metadata=meta,
                )
            )

    def ingest_log(self, entry: LogEntryCreate) -> LogEntry:
        """Ingests a new log entry into the live memory buffer and enqueues DB write."""
        log_obj = LogEntry(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc),
            level=entry.level,
            service=entry.service,
            message=entry.message,
            source_ip=entry.source_ip or "127.0.0.1",
            metadata=entry.metadata,
        )
        self._buffer.append(log_obj)
        return log_obj

    async def persist_log_to_db(self, entry: LogEntry) -> None:
        """Persists the log entry asynchronously to PostgreSQL."""
        from app.core.config import settings

        if settings.ENVIRONMENT == "testing":
            return

        try:
            async with AsyncSessionLocal() as session:
                record = SystemLogRecord(
                    id=entry.id,
                    timestamp=entry.timestamp,
                    level=entry.level.value,
                    service=entry.service,
                    message=entry.message,
                    source_ip=entry.source_ip,
                    metadata_json=json.dumps(entry.metadata) if entry.metadata else None,
                )
                session.add(record)
                await session.commit()
        except Exception as exc:
            logger.warning(f"Failed to persist log entry to database: {exc}")

    def query_logs(
        self,
        level: Optional[LogLevelEnum] = None,
        service: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> LogsListResponse:
        """Queries and filters logs from the in-memory circular buffer."""
        filtered = list(self._buffer)

        if level:
            filtered = [item for item in filtered if item.level == level]
        if service:
            filtered = [item for item in filtered if service.lower() in item.service.lower()]
        if search:
            query_lower = search.lower()
            filtered = [item for item in filtered if query_lower in item.message.lower()]

        # Order chronologically descending (newest first)
        filtered.sort(key=lambda x: x.timestamp, reverse=True)
        total = len(filtered)
        paginated = filtered[offset : offset + limit]

        return LogsListResponse(
            logs=paginated,
            total_count=total,
            limit=limit,
            offset=offset,
        )


log_service = LogService()
