from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator
import re


class ProtocolType(str, Enum):
    HTTP = "HTTP"
    HTTPS = "HTTPS"
    TCP = "TCP"


class ProbeModuleType(str, Enum):
    HTTP_2XX = "http_2xx"
    HTTP_POST_2XX = "http_post_2xx"
    TCP_CONNECT = "tcp_connect"
    TLS_CONNECT = "tls_connect"


class ServiceAvailabilityStatus(str, Enum):
    UP = "UP"
    DOWN = "DOWN"
    DEGRADED = "DEGRADED"
    UNKNOWN = "UNKNOWN"


def validate_target_url_security(url: str, protocol: str) -> str:
    """
    Validates target URL to enforce protocol restrictions and protect against SSRF.
    Rejects cloud metadata endpoints, malformed URLs, and non-whitelisted schemes.
    """
    cleaned = url.strip()
    if not cleaned:
        raise ValueError("Target URL cannot be empty")

    # SSRF Protection: Deny cloud metadata endpoints and link-local addresses
    prohibited_patterns = [
        r"^https?://169\.254\.169\.254",  # AWS/GCP/Azure IMDS
        r"^https?://metadata\.google\.internal",
        r"^https?://metadata\.azure\.com",
        r"^https?://100\.100\.100\.200",  # Alibaba metadata
        r"^https?://\[fd00:ec2::254\]",   # IPv6 IMDS
    ]
    for pat in prohibited_patterns:
        if re.search(pat, cleaned, re.IGNORECASE):
            raise ValueError("Prohibited target: Access to cloud metadata endpoints is strictly blocked")

    proto_upper = protocol.upper()
    if proto_upper in ("HTTP", "HTTPS"):
        if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
            raise ValueError(f"URL for protocol {proto_upper} must start with http:// or https://")
    elif proto_upper == "TCP":
        # Format: host:port or tcp://host:port
        host_port = cleaned.replace("tcp://", "")
        if ":" not in host_port:
            raise ValueError("TCP target must be in format 'hostname:port' or 'ip:port'")
        parts = host_port.split(":")
        try:
            port = int(parts[-1])
            if port < 1 or port > 65535:
                raise ValueError("TCP port must be between 1 and 65535")
        except ValueError:
            raise ValueError("Invalid TCP port number")

    return cleaned


class MonitoredServiceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=128, description="Human-readable service identifier")
    target_url: str = Field(..., max_length=512, description="Target URL or host:port to probe")
    protocol: ProtocolType = Field(default=ProtocolType.HTTP, description="Probe protocol")
    probe_module: ProbeModuleType = Field(default=ProbeModuleType.HTTP_2XX, description="Blackbox probe module")
    expected_status_code: int = Field(default=200, ge=100, le=599, description="Expected HTTP response status")
    probe_interval_seconds: int = Field(default=30, ge=5, le=3600, description="Probe polling interval")
    timeout_seconds: float = Field(default=5.0, ge=0.5, le=30.0, description="Probe timeout in seconds")
    enabled: bool = Field(default=True, description="Whether monitoring is actively scheduled")
    description: Optional[str] = Field(default=None, max_length=1000)
    tags: Optional[str] = Field(default=None, max_length=256, description="Comma-separated tags")

    @field_validator("target_url")
    @classmethod
    def validate_url(cls, v: str, info) -> str:
        protocol = info.data.get("protocol", ProtocolType.HTTP)
        proto_str = protocol.value if isinstance(protocol, ProtocolType) else str(protocol)
        return validate_target_url_security(v, proto_str)


class MonitoredServiceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=128)
    target_url: Optional[str] = Field(default=None, max_length=512)
    protocol: Optional[ProtocolType] = None
    probe_module: Optional[ProbeModuleType] = None
    expected_status_code: Optional[int] = Field(default=None, ge=100, le=599)
    probe_interval_seconds: Optional[int] = Field(default=None, ge=5, le=3600)
    timeout_seconds: Optional[float] = Field(default=None, ge=0.5, le=30.0)
    enabled: Optional[bool] = None
    description: Optional[str] = None
    tags: Optional[str] = None

    @field_validator("target_url")
    @classmethod
    def validate_url_if_present(cls, v: Optional[str], info) -> Optional[str]:
        if v is not None:
            protocol = info.data.get("protocol", ProtocolType.HTTP)
            proto_str = protocol.value if isinstance(protocol, ProtocolType) else str(protocol)
            return validate_target_url_security(v, proto_str)
        return v


class MonitoredServiceResponse(BaseModel):
    id: str
    name: str
    target_url: str
    protocol: str
    probe_module: str
    expected_status_code: int
    probe_interval_seconds: int
    timeout_seconds: float
    enabled: bool
    description: Optional[str] = None
    tags: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Live Probing Diagnostics
    availability_status: ServiceAvailabilityStatus = ServiceAvailabilityStatus.UNKNOWN
    response_time_ms: Optional[float] = None
    http_status_code: Optional[int] = None
    probe_duration_ms: Optional[float] = None
    tls_cert_expiry_days: Optional[float] = None
    last_successful_check: Optional[datetime] = None
    last_error: Optional[str] = None

    model_config = {"from_attributes": True}


class ServicesListResponse(BaseModel):
    total: int = 0
    active_count: int = 0
    up_count: int = 0
    down_count: int = 0
    services: list[MonitoredServiceResponse] = Field(default_factory=list)


class WindowsServiceInfo(BaseModel):
    name: str = Field(..., description="Service identifier key")
    display_name: str = Field(..., description="Human-readable service name")
    state: str = Field(..., description="Current running state (e.g. running, stopped)")
    start_mode: str = Field(default="unknown", description="Startup type (auto, manual, disabled)")
    is_healthy: bool = Field(default=True, description="Whether state matches healthy baseline")
    run_as: Optional[str] = Field(default=None, description="Account service runs under")
    last_observed: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WindowsServicesResponse(BaseModel):
    services: list[WindowsServiceInfo] = Field(default_factory=list)
    collector_enabled: bool = True
    total_services_monitored: int = 0
    running_count: int = 0
    stopped_count: int = 0

