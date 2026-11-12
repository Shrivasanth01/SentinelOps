from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class AnomalySeverityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AnomalyEvent(BaseModel):
    id: str
    timestamp: datetime
    score: float = Field(..., description="Anomaly score normalized to [0.0 - 1.0], higher = more anomalous")
    is_anomaly: bool = Field(..., description="Binary classification from Isolation Forest")
    severity: AnomalySeverityEnum
    contributing_metrics: List[str] = Field(default_factory=list, description="Metrics deviating from statistical baseline")
    description: str
    resolved: bool = False


class AnomalyScoreResponse(BaseModel):
    score: float
    is_anomaly: bool
    status: str
    severity: AnomalySeverityEnum
    contributing_metrics: List[str]
    model_trained: bool
    baseline_samples: int
    timestamp: datetime


class AnomalyHistoryResponse(BaseModel):
    anomalies: List[AnomalyEvent]
    total_count: int


class ModelTrainResponse(BaseModel):
    success: bool
    sample_count: int
    contamination: float
    message: str

