from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class LogLevelEnum(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogEntryCreate(BaseModel):
    level: LogLevelEnum = Field(default=LogLevelEnum.INFO, description="Log severity level")
    service: str = Field(..., description="Source service or application identifier", max_length=64)
    message: str = Field(..., description="Log message body")
    source_ip: Optional[str] = Field(None, description="Client or origin IP address", max_length=45)
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Structured contextual key-value fields")


class LogEntry(BaseModel):
    id: str
    timestamp: datetime
    level: LogLevelEnum
    service: str
    message: str
    source_ip: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class LogsListResponse(BaseModel):
    logs: List[LogEntry]
    total_count: int
    limit: int
    offset: int
