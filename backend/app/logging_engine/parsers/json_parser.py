import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from app.logging_engine.parsers.redaction import redact_metadata_dict, redact_sensitive_text
from app.logging_engine.schemas.logs import LogEntry, LogLevelEnum


def parse_json_log_line(
    raw_line: str,
    default_service: str = "sentinelops-api",
    default_source: str = "APPLICATION_LOG",
) -> Optional[LogEntry]:
    """
    Parses a single JSON log line into a sanitized LogEntry.
    Extracts timestamp, level, service, message, correlation_id, and metadata.
    """
    cleaned = raw_line.strip()
    if not cleaned:
        return None

    try:
        data: Dict[str, Any] = json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback to plain text line
        return LogEntry(
            id=f"raw-{uuid.uuid4().hex[:8]}",
            timestamp=datetime.now(timezone.utc),
            level=LogLevelEnum.INFO,
            service=default_service,
            message=redact_sensitive_text(cleaned),
            source=default_source,
            raw=cleaned,
        )

    # 1. Parse timestamp
    ts_val = data.get("timestamp") or data.get("time") or data.get("@timestamp")
    timestamp = datetime.now(timezone.utc)
    if isinstance(ts_val, (int, float)):
        # epoch seconds or ms
        if ts_val > 1e11:
            timestamp = datetime.fromtimestamp(ts_val / 1000.0, timezone.utc)
        else:
            timestamp = datetime.fromtimestamp(ts_val, timezone.utc)
    elif isinstance(ts_val, str):
        try:
            timestamp = datetime.fromisoformat(ts_val.replace("Z", "+00:00"))
        except Exception:
            timestamp = datetime.now(timezone.utc)

    # 2. Parse level
    level_raw = str(data.get("level") or data.get("severity") or "INFO").strip().upper()
    try:
        level = LogLevelEnum(level_raw)
    except ValueError:
        level = LogLevelEnum.INFO

    # 3. Parse service and message
    service = data.get("service") or data.get("logger") or default_service
    message = str(data.get("message") or data.get("msg") or data.get("log") or "")

    # 4. Extract correlation and metadata
    correlation_id = data.get("correlation_id") or data.get("request_id")
    metadata = {k: v for k, v in data.items() if k not in ("timestamp", "level", "service", "message", "msg", "log")}

    # 5. Redact sensitive values
    sanitized_msg = redact_sensitive_text(message)
    sanitized_metadata = redact_metadata_dict(metadata)

    entry_id = data.get("id") or f"log-{uuid.uuid4().hex[:8]}"

    return LogEntry(
        id=str(entry_id),
        timestamp=timestamp,
        level=level,
        service=str(service),
        message=sanitized_msg,
        source=default_source,
        correlation_id=str(correlation_id) if correlation_id else None,
        metadata=sanitized_metadata,
        raw=cleaned,
    )
