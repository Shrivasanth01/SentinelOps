from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class PredictionEnum(str, Enum):
    NORMAL = "NORMAL"
    ANOMALOUS = "ANOMALOUS"
    UNKNOWN = "UNKNOWN"


class AnomalySeverityEnum(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"


class AnomalyEvent(BaseModel):
    id: str
    timestamp: datetime
    host_id: str = "windows-host"
    score: float = Field(..., description="Normalized anomaly risk score [0.0 - 1.0], higher = more anomalous")
    raw_score: float = Field(default=0.0, description="Raw decision function output from Isolation Forest")
    prediction: PredictionEnum = Field(default=PredictionEnum.ANOMALOUS)
    severity: AnomalySeverityEnum
    contributing_metrics: List[str] = Field(default_factory=list, description="Subsystems exceeding normal variance")
    feature_snapshot: Optional[Dict[str, float]] = Field(default=None, description="Captured telemetry vector at detection")
    model_version: Optional[str] = None
    description: str
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    investigation_notes: Optional[str] = None
    resolved: bool = False

    model_config = {"from_attributes": True}


class AnomalyDetectionRequest(BaseModel):
    """Optional manual snapshot for ad-hoc inference; if omitted, live host metrics are scraped."""
    host_id: Optional[str] = "windows-host"
    features: Optional[Dict[str, float]] = None


class AnomalyDetectionResponse(BaseModel):
    timestamp: datetime
    host_id: str
    features: Dict[str, float]
    prediction: PredictionEnum
    score: float = Field(..., description="Normalized anomaly score [0.0 - 1.0]")
    raw_score: float = Field(..., description="Raw Isolation Forest decision score")
    severity: AnomalySeverityEnum
    contributing_metrics: List[str]
    model_version: str
    detection_status: str
    explanation: str


class AnomalyListResponse(BaseModel):
    anomalies: List[AnomalyEvent]
    total: int
    limit: int
    offset: int


class AnomalySummaryResponse(BaseModel):
    total_detections: int
    normal_count: int
    anomalous_count: int
    unknown_count: int
    severity_breakdown: Dict[str, int]
    acknowledged_count: int
    unacknowledged_count: int
    active_model_version: Optional[str]
    last_detection_timestamp: Optional[datetime]


class TimelineBucket(BaseModel):
    timestamp: float
    time_label: str
    total_count: int = 0
    anomalous_count: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0


class AnomalyTimelineResponse(BaseModel):
    buckets: List[TimelineBucket]
    start_time: float
    end_time: float
    bucket_size_seconds: int
    total_events: int


class AnomalyAcknowledgeRequest(BaseModel):
    acknowledged_by: str = Field(..., min_length=2, max_length=64, description="Operator identifier")
    notes: Optional[str] = Field(None, max_length=2000, description="Investigation findings or remediation notes")
