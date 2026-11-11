from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from app.schemas.common import HealthStatusEnum


class LivenessResponse(BaseModel):
    status: HealthStatusEnum = Field(..., description="Overall liveness status")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Platform version")
    uptime_seconds: float = Field(..., description="Uptime in seconds since start")
    timestamp: datetime = Field(..., description="Probe response UTC timestamp")


class DatabaseHealth(BaseModel):
    status: HealthStatusEnum = Field(..., description="Database connectivity status")
    connected: bool = Field(..., description="Whether database connection succeeded")
    latency_ms: float = Field(..., description="Query execution latency in milliseconds")
    pool_info: Optional[Dict[str, Any]] = Field(default=None, description="Connection pool diagnostic stats")
    error: Optional[str] = Field(default=None, description="Failure reason if disconnected")


class ReadinessResponse(BaseModel):
    status: HealthStatusEnum = Field(..., description="Platform readiness status")
    database: DatabaseHealth = Field(..., description="PostgreSQL database health status")
    timestamp: datetime = Field(..., description="Probe response UTC timestamp")


class SystemInfoResponse(BaseModel):
    project_name: str
    tagline: str
    version: str
    environment: str
    debug: bool
    python_version: str
    os_platform: str
    timestamp: datetime

