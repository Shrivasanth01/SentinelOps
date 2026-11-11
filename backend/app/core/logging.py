import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict


class StructuredJsonFormatter(logging.Formatter):
    """
    Structured JSON log formatter for production and cloud-native environments.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_record: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include contextual fields if present
        if hasattr(record, "correlation_id"):
            log_record["correlation_id"] = record.correlation_id

        if hasattr(record, "path"):
            log_record["path"] = record.path

        if hasattr(record, "method"):
            log_record["method"] = record.method

        if hasattr(record, "status_code"):
            log_record["status_code"] = record.status_code

        if hasattr(record, "duration_ms"):
            log_record["duration_ms"] = record.duration_ms

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


class StandardConsoleFormatter(logging.Formatter):
    """
    Human-readable console formatter for local development with color accents.
    """

    COLORS = {
        logging.DEBUG: "\033[36m",    # Cyan
        logging.INFO: "\033[32m",     # Green
        logging.WARNING: "\033[33m",  # Yellow
        logging.ERROR: "\033[31m",    # Red
        logging.CRITICAL: "\033[41m", # Red background
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelno, self.RESET)
        correlation_id = getattr(record, "correlation_id", "-")
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

        prefix = f"{timestamp} [{color}{record.levelname:<7}{self.RESET}] [{record.name}] [{correlation_id}]"
        message = record.getMessage()

        if record.exc_info:
            message += "\n" + self.formatException(record.exc_info)

        return f"{prefix} {message}"


def setup_logging(environment: str = "development", debug: bool = False) -> None:
    """
    Configures structured logging for SentinelOps.
    Uses JSON in production / staging and standard colorized output in development.
    """
    log_level = logging.DEBUG if debug else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    if environment.lower() in ("production", "staging"):
        handler.setFormatter(StructuredJsonFormatter())
    else:
        handler.setFormatter(StandardConsoleFormatter())

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers to avoid duplicates
    for h in list(root_logger.handlers):
        root_logger.removeHandler(h)

    root_logger.addHandler(handler)

    # Quiet overly verbose third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


logger = logging.getLogger("sentinelops")

