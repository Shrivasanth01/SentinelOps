import hashlib
import re
from typing import List
from app.logging_engine.schemas.logs import ErrorGroup, LogEntry, LogLevelEnum


# Normalization regex rules to replace variable noise in error messages
NORMALIZATION_RULES = [
    # ISO timestamps
    (re.compile(r"\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b"), "<TIMESTAMP>"),
    # UUIDs
    (re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"), "<UUID>"),
    # Memory / Hex addresses
    (re.compile(r"\b0x[0-9a-fA-F]+\b"), "<HEX>"),
    # IP addresses
    (re.compile(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?\b"), "<IP:PORT>"),
    # Port / thread / process numbers (e.g. PID: 1234, thread 5)
    (re.compile(r"\b(?:PID|Thread|Process|Task|ID|line)\s*[:=]?\s*\d+\b", re.IGNORECASE), "<NUM_REF>"),
    # Durations / sizes / numbers (e.g. 5000ms, 120s, 500)
    (re.compile(r"\b\d+(?:\.\d+)?(?:ms|s|m|h|ns|us|b|kb|mb|gb)?\b", re.IGNORECASE), "<NUM>"),
    # Excessive whitespace
    (re.compile(r"\s+"), " "),
]


def normalize_error_message(message: str) -> str:
    """
    Normalizes variable parameters (timestamps, UUIDs, hex pointers, numbers)
    from error text to identify the recurring underlying pattern.
    """
    cleaned = message.strip()
    for regex, replacement in NORMALIZATION_RULES:
        cleaned = regex.sub(replacement, cleaned)
    return cleaned.strip()


def compute_error_fingerprint(service: str, normalized_pattern: str) -> str:
    """Computes a deterministic MD5 hash for the normalized pattern + service."""
    raw = f"{service.lower()}:{normalized_pattern}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()[:16]


def group_error_logs(logs: List[LogEntry]) -> List[ErrorGroup]:
    """
    Groups error and critical logs by their normalized message patterns.
    Preserves original log events while generating pattern frequency analytics.
    """
    error_logs = [l for l in logs if l.level in (LogLevelEnum.ERROR, LogLevelEnum.CRITICAL)]
    if not error_logs:
        return []

    groups_map: dict[str, dict] = {}

    for entry in error_logs:
        pattern = normalize_error_message(entry.message)
        fp = compute_error_fingerprint(entry.service, pattern)

        if fp not in groups_map:
            groups_map[fp] = {
                "fingerprint": fp,
                "pattern": pattern,
                "count": 0,
                "level": entry.level,
                "service": entry.service,
                "first_seen": entry.timestamp,
                "last_seen": entry.timestamp,
                "sample_message": entry.message,
            }

        rec = groups_map[fp]
        rec["count"] += 1
        if entry.timestamp < rec["first_seen"]:
            rec["first_seen"] = entry.timestamp
        if entry.timestamp > rec["last_seen"]:
            rec["last_seen"] = entry.timestamp
            rec["sample_message"] = entry.message
        # Escalate level to CRITICAL if any occurrence is CRITICAL
        if entry.level == LogLevelEnum.CRITICAL:
            rec["level"] = LogLevelEnum.CRITICAL

    # Return sorted by count descending
    result = [ErrorGroup(**val) for val in groups_map.values()]
    result.sort(key=lambda g: g.count, reverse=True)
    return result
