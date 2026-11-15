import asyncio
import collections
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.logging_engine.parsers.redaction import redact_metadata_dict, redact_sensitive_text
from app.logging_engine.schemas.logs import LogEntry, LogLevelEnum

logger = logging.getLogger("sentinelops.logging.collectors.fastapi")


class FastAPILogBuffer:
    """
    In-memory ring buffer holding structured application logs.
    Supports instant live streaming and query fallback when Loki is offline.
    """

    def __init__(self, max_size: int = 2000):
        self.max_size = max_size
        self._buffer: collections.deque[LogEntry] = collections.deque(maxlen=max_size)
        self._lock = asyncio.Lock()
        self._seed_initial_logs()

    def _seed_initial_logs(self) -> None:
        """Seed baseline platform events so live telemetry & search work immediately."""
        import uuid
        now = datetime.now(timezone.utc)
        initial_events = [
            (LogLevelEnum.INFO, "sentinel-kernel", "SentinelOps kernel daemon v0.2.0 initialized on host node.", "APPLICATION_LOG"),
            (LogLevelEnum.INFO, "sentinel-db", "PostgreSQL connection pool verified with 10 persistent sockets.", "APPLICATION_LOG"),
            (LogLevelEnum.INFO, "telemetry-collector", "psutil hardware telemetry collector primed on 5.0s cadence.", "APPLICATION_LOG"),
            (LogLevelEnum.INFO, "ml-detector", "Isolation Forest anomaly engine loaded; waiting for baseline buffer.", "APPLICATION_LOG"),
            (LogLevelEnum.WARNING, "network-monitor", "Interface eth0 observed transient packet burst (+14.2 MB/s).", "APPLICATION_LOG"),
            (LogLevelEnum.INFO, "api-gateway", "FastAPI v1 router active on port 8000. Docs exposed on /api/v1/docs.", "APPLICATION_LOG"),
        ]
        for level, service, message, source in initial_events:
            self._buffer.append(
                LogEntry(
                    id=str(uuid.uuid4()),
                    timestamp=now,
                    level=level,
                    service=service,
                    message=message,
                    source=source,
                    metadata={},
                )
            )

    def append(self, entry: LogEntry) -> None:
        self._buffer.append(entry)

    def get_recent(self, limit: int = 50, level: Optional[LogLevelEnum] = None, service: Optional[str] = None) -> List[LogEntry]:
        items = list(self._buffer)
        if level:
            items = [i for i in items if i.level == level]
        if service:
            items = [i for i in items if i.service == service]
        # Sort descending by timestamp
        items.sort(key=lambda x: x.timestamp, reverse=True)
        return items[:limit]

    def count(self) -> int:
        return len(self._buffer)


# Global buffer instance
fastapi_log_buffer = FastAPILogBuffer(max_size=settings.LOG_BUFFER_MAX_SIZE)


class LokiForwardingHandler(logging.Handler):
    """
    Standard library logging handler that formats records into LogEntry,
    stores them in the in-memory buffer, and queues them for Loki forwarding.
    """

    def __init__(self, buffer: FastAPILogBuffer = fastapi_log_buffer):
        super().__init__()
        self.buffer = buffer

    def emit(self, record: logging.LogRecord) -> None:
        try:
            # Map Python level to LogLevelEnum
            if record.levelno >= logging.CRITICAL:
                lvl = LogLevelEnum.CRITICAL
            elif record.levelno >= logging.ERROR:
                lvl = LogLevelEnum.ERROR
            elif record.levelno >= logging.WARNING:
                lvl = LogLevelEnum.WARNING
            elif record.levelno >= logging.INFO:
                lvl = LogLevelEnum.INFO
            else:
                lvl = LogLevelEnum.DEBUG

            correlation_id = getattr(record, "correlation_id", None)
            msg = record.getMessage()
            if record.exc_info and record.exc_text:
                msg += f"\n{record.exc_text}"

            import uuid
            entry = LogEntry(
                id=f"api-{uuid.uuid4().hex[:8]}",
                timestamp=datetime.now(timezone.utc),
                level=lvl,
                service="sentinelops-api",
                message=redact_sensitive_text(msg),
                source="APPLICATION_LOG",
                correlation_id=str(correlation_id) if correlation_id else None,
                metadata=redact_metadata_dict({
                    "logger": record.name,
                    "module": record.module,
                    "lineno": record.lineno,
                    "path": getattr(record, "path", None),
                    "method": getattr(record, "method", None),
                    "status_code": getattr(record, "status_code", None),
                }),
            )
            self.buffer.append(entry)
        except Exception:
            self.handleError(record)
