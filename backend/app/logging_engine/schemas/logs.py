from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
import re


class LogLevelEnum(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class LogSourceTypeEnum(str, Enum):
    WINDOWS_EVENT = "WINDOWS_EVENT"
    APPLICATION_LOG = "APPLICATION_LOG"
    CONTAINER_LOG = "CONTAINER_LOG"
    FILE = "FILE"


class LogFormatEnum(str, Enum):
    JSON = "JSON"
    WINDOWS_XML = "WINDOWS_XML"
    LOGFMT = "LOGFMT"
    RAW_TEXT = "RAW_TEXT"


class LogEntry(BaseModel):
    id: str = Field(..., description="Unique log identifier")
    timestamp: datetime = Field(..., description="Normalized UTC timestamp")
    level: LogLevelEnum = Field(default=LogLevelEnum.INFO, description="Deterministic severity level")
    service: str = Field(..., description="Originating service or channel")
    message: str = Field(..., description="Sanitized log message payload")
    source: str = Field(default="system", description="Collection pipeline source category")
    channel_or_file: Optional[str] = None
    event_id: Optional[int] = Field(default=None, description="Windows Event ID (distinct from severity)")
    provider: Optional[str] = None
    computer: Optional[str] = None
    correlation_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    raw: Optional[str] = None

    model_config = {"from_attributes": True}


class LogSearchResult(BaseModel):
    logs: List[LogEntry] = Field(default_factory=list)
    total: int = 0
    total_count: int = 0
    limit: int = 50
    offset: int = 0
    has_more: bool = False
    query_used: str = ""
    time_range: Optional[str] = None
    execution_time_ms: float = 0.0
    loki_connected: bool = True


class LogSourceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=128, description="Human-readable source name")
    source_type: LogSourceTypeEnum = Field(..., description="Type of collection source")
    channel_or_path: str = Field(..., min_length=1, max_length=512, description="Channel name or validated file path")
    description: Optional[str] = None
    format: LogFormatEnum = Field(default=LogFormatEnum.JSON)
    enabled: bool = True
    tags: Optional[str] = None

    @field_validator("channel_or_path")
    @classmethod
    def validate_source_target(cls, v: str, info) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("channel_or_path cannot be empty")

        source_type = info.data.get("source_type")
        if source_type == LogSourceTypeEnum.WINDOWS_EVENT:
            allowed_channels = ["System", "Application"]
            # Security requires explicit authorization flag
            if cleaned.lower() == "security":
                raise ValueError("Security channel collection requires explicit administrative authorization.")
            if cleaned not in allowed_channels and not cleaned.startswith("Microsoft-Windows-"):
                raise ValueError(f"Windows Event channel must be 'System', 'Application', or a valid provider. Got '{cleaned}'")
        elif source_type == LogSourceTypeEnum.FILE:
            # Prevent path traversal attacks
            if ".." in cleaned or cleaned.startswith("/") or re.search(r"^[a-zA-Z]:\\(Windows|System32|Program Files)", cleaned, re.IGNORECASE):
                raise ValueError("Path traversal or access to restricted system directories is prohibited.")
        return cleaned


class LogSourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    format: Optional[LogFormatEnum] = None
    enabled: Optional[bool] = None
    tags: Optional[str] = None


class LogSourceResponse(BaseModel):
    id: str
    name: str
    source_type: LogSourceTypeEnum
    channel_or_path: str
    description: Optional[str] = None
    format: LogFormatEnum
    enabled: bool
    tags: Optional[str] = None
    collection_status: str
    error_message: Optional[str] = None
    last_collected_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LogSourcesListResponse(BaseModel):
    sources: List[LogSourceResponse]
    total: int
    active_count: int


class ErrorGroup(BaseModel):
    fingerprint: str = Field(..., description="MD5 hash of normalized error pattern")
    pattern: str = Field(..., description="Normalized message pattern with variables masked")
    count: int = Field(..., description="Total occurrences observed")
    level: LogLevelEnum = Field(default=LogLevelEnum.ERROR)
    service: str = Field(..., description="Impacted service")
    first_seen: datetime
    last_seen: datetime
    sample_message: str


class ErrorIntelligenceResponse(BaseModel):
    total_errors: int = 0
    unique_patterns: int = 0
    groups: List[ErrorGroup] = Field(default_factory=list)


class TimelineBucket(BaseModel):
    timestamp: float
    time_label: str
    count: int = 0
    error_count: int = 0
    warning_count: int = 0
    info_count: int = 0


class LogTimelineResponse(BaseModel):
    buckets: List[TimelineBucket] = Field(default_factory=list)
    start_time: float
    end_time: float
    bucket_size_seconds: int
    total_events: int


class LogSummaryResponse(BaseModel):
    total_logs: int = 0
    level_distribution: Dict[str, int] = Field(default_factory=dict)
    service_distribution: Dict[str, int] = Field(default_factory=dict)
    recent_error_rate: float = 0.0
    collection_health: str = "HEALTHY"


class LogCorrelationResponse(BaseModel):
    metric_name: str
    metric_event_timestamp: float
    window_seconds: int
    start_time: float
    end_time: float
    logs: List[LogEntry] = Field(default_factory=list)
    correlated_count: int = 0
    error_count: int = 0
    warning_count: int = 0
    disclaimer: str = "Temporal proximity demonstrates concurrence within the time window and does not establish a causal relationship."


class LogHealthResponse(BaseModel):
    loki_status: str
    loki_url: str
    loki_latency_ms: Optional[float] = None
    sources_configured: int = 0
    sources_healthy: int = 0
    ingestion_active: bool = True
    redaction_enabled: bool = True
