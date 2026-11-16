import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from app.logging_engine.schemas.logs import LogEntry, LogLevelEnum


def map_windows_level(level_raw: Any) -> LogLevelEnum:
    """
    Deterministically maps Windows Event Log level to SentinelOps LogLevelEnum.
    Windows Event Log standard levels:
      1: Critical
      2: Error
      3: Warning
      4: Information
      5: Verbose
    IMPORTANT: Never confuse numerical Event ID (e.g. 1001, 7036) with Level!
    """
    if level_raw is None:
        return LogLevelEnum.INFO

    # Handle string names
    if isinstance(level_raw, str):
        cleaned = level_raw.strip().upper()
        if cleaned in ("CRITICAL", "1"):
            return LogLevelEnum.CRITICAL
        elif cleaned in ("ERROR", "ERR", "2"):
            return LogLevelEnum.ERROR
        elif cleaned in ("WARNING", "WARN", "3"):
            return LogLevelEnum.WARNING
        elif cleaned in ("INFORMATION", "INFO", "4"):
            return LogLevelEnum.INFO
        elif cleaned in ("VERBOSE", "DEBUG", "5"):
            return LogLevelEnum.DEBUG
        return LogLevelEnum.INFO

    # Handle numerical integer levels
    try:
        val = int(level_raw)
        if val == 1:
            return LogLevelEnum.CRITICAL
        elif val == 2:
            return LogLevelEnum.ERROR
        elif val == 3:
            return LogLevelEnum.WARNING
        elif val == 4:
            return LogLevelEnum.INFO
        elif val >= 5:
            return LogLevelEnum.DEBUG
    except (ValueError, TypeError):
        pass

    return LogLevelEnum.INFO


def parse_windows_event_dict(event_dict: Dict[str, Any]) -> LogEntry:
    """
    Parses a dictionary representation of a Windows Event into a standardized LogEntry.
    """
    event_id = event_dict.get("Id") or event_dict.get("EventID") or event_dict.get("event_id")
    try:
        event_id_int = int(event_id) if event_id is not None else None
    except (ValueError, TypeError):
        event_id_int = None

    level_raw = event_dict.get("Level") or event_dict.get("LevelDisplayName") or event_dict.get("level")
    level = map_windows_level(level_raw)

    provider = event_dict.get("ProviderName") or event_dict.get("provider") or "Microsoft-Windows"
    channel = event_dict.get("LogName") or event_dict.get("Channel") or event_dict.get("channel") or "System"
    computer = event_dict.get("MachineName") or event_dict.get("Computer") or event_dict.get("computer")
    message = event_dict.get("Message") or event_dict.get("message") or f"Windows Event ID {event_id_int} from {provider}"

    # Parse timestamp
    ts_raw = event_dict.get("TimeCreated") or event_dict.get("timestamp")
    timestamp = datetime.now(timezone.utc)
    if isinstance(ts_raw, datetime):
        timestamp = ts_raw if ts_raw.tzinfo else ts_raw.replace(tzinfo=timezone.utc)
    elif isinstance(ts_raw, str):
        try:
            # Handle ISO or PowerShell DateTime format
            cleaned_ts = re.sub(r"/Date\((\d+)\)/", r"\1", ts_raw)
            if cleaned_ts.isdigit():
                timestamp = datetime.fromtimestamp(int(cleaned_ts) / 1000.0, timezone.utc)
            else:
                timestamp = datetime.fromisoformat(cleaned_ts.replace("Z", "+00:00"))
        except Exception:
            timestamp = datetime.now(timezone.utc)

    import uuid
    entry_id = f"win-{channel.lower()}-{uuid.uuid4().hex[:8]}"

    return LogEntry(
        id=entry_id,
        timestamp=timestamp,
        level=level,
        service=f"windows-{channel.lower()}",
        message=message.strip(),
        source="WINDOWS_EVENT",
        channel_or_file=channel,
        event_id=event_id_int,
        provider=provider,
        computer=computer,
        metadata={
            "channel": channel,
            "provider": provider,
            "event_id": event_id_int,
            "computer": computer,
            "record_id": event_dict.get("RecordId"),
        },
        raw=str(event_dict),
    )

