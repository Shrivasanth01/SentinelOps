from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ModelStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    CANDIDATE = "CANDIDATE"
    ARCHIVED = "ARCHIVED"
    FAILED = "FAILED"
    VALIDATED = "VALIDATED"


class ModelMetadata(BaseModel):
    id: str
    version: str
    model_type: str
    file_path: str
    n_estimators: int
    contamination: float
    random_state: int
    features: List[str]
    training_sample_count: int
    training_time_range_start: Optional[datetime] = None
    training_time_range_end: Optional[datetime] = None
    training_duration_seconds: float
    evaluation_metrics: Optional[Dict[str, Any]] = None
    is_active: bool
    status: ModelStatusEnum
    created_at: datetime

    model_config = {"from_attributes": True}


class ModelListResponse(BaseModel):
    models: List[ModelMetadata]
    total: int
    active_model: Optional[ModelMetadata] = None


class ModelTrainRequest(BaseModel):
    time_range: str = Field(default="1h", description="Historical Prometheus window: 15m, 1h, 6h, 24h, 7d")
    contamination: Optional[float] = Field(default=None, ge=0.001, le=0.5, description="Expected anomaly fraction")
    n_estimators: Optional[int] = Field(default=None, ge=10, le=500, description="Number of isolation trees")
    activate_if_valid: bool = Field(default=True, description="Hot-swap active model if holdout validation passes")


class ModelTrainResponse(BaseModel):
    success: bool
    model_id: Optional[str] = None
    version: Optional[str] = None
    sample_count: int = 0
    duration_seconds: float = 0.0
    contamination: float = 0.05
    n_estimators: int = 100
    is_active: bool = False
    evaluation: Optional[Dict[str, Any]] = None
    message: str


class ModelEvaluationResponse(BaseModel):
    model_id: str
    version: str
    evaluation_samples: int
    anomaly_rate: float
    score_quantiles: Dict[str, float]
    score_mean: float
    score_std: float
    stability_assessment: str
    limitations: str = "Unsupervised holdout assessment: without ground truth incident labels, precision and recall cannot be reliably computed."


class MLStatusResponse(BaseModel):
    engine_status: str
    active_model_version: Optional[str]
    active_model_id: Optional[str]
    total_registered_models: int
    prometheus_connected: bool
    last_training_time: Optional[datetime]
    total_anomalies_recorded: int
    features_active: List[str]


class FeatureItem(BaseModel):
    name: str
    description: str
    unit: str
    metric_type: Optional[str] = None
    is_derived: bool = False


class FeatureSchemaResponse(BaseModel):
    base_features: List[FeatureItem]
    derived_features: List[FeatureItem]
    total_features: int
