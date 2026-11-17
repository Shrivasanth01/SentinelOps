import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple, Any
import numpy as np
from app.ml.features.engineering import FeatureEngineer
from app.ml.inference.scoring import classify_severity
from app.ml.models.model_registry import model_registry
from app.ml.schemas.anomaly import (
    AnomalyDetectionResponse,
    AnomalySeverityEnum,
    PredictionEnum,
)

logger = logging.getLogger("sentinelops.ml.inference.predictor")


class AnomalyPredictor:
    """
    Real-time inference orchestrator.
    Extracts ordered feature vectors, executes Isolation Forest scoring,
    and formats evidence-backed anomaly detection responses.
    """

    def __init__(self):
        self.engineer = FeatureEngineer()

    def predict_observation(
        self,
        features: Dict[str, float],
        host_id: str = "windows-host",
        timestamp: Optional[datetime] = None,
    ) -> AnomalyDetectionResponse:
        """
        Executes inference for a single host telemetry observation.
        If no active model is loaded, returns UNKNOWN state rather than fake normality.
        """
        ts = timestamp or datetime.now(timezone.utc)
        active_model = model_registry.get_active_model()

        if active_model is None or not active_model.is_fitted:
            return AnomalyDetectionResponse(
                timestamp=ts,
                host_id=host_id,
                features=features,
                prediction=PredictionEnum.UNKNOWN,
                score=0.0,
                raw_score=0.0,
                severity=AnomalySeverityEnum.NONE,
                contributing_metrics=[],
                model_version="NONE",
                detection_status="MODEL_UNAVAILABLE",
                explanation="No active machine learning model is registered in memory. Train or activate a model first.",
            )

        # Extract aligned 2D feature vector matching model schema
        vector_1d = self.engineer.extract_single_vector(features, active_model.feature_names)
        X = np.array([vector_1d], dtype=np.float64)

        raw_scores, norm_scores, is_anomaly_flags = active_model.score_samples(X)

        raw_score = float(raw_scores[0])
        norm_score = float(norm_scores[0])
        is_anomaly = bool(is_anomaly_flags[0])

        severity, contributing, explanation = classify_severity(norm_score, features, is_anomaly)

        prediction = PredictionEnum.ANOMALOUS if is_anomaly else PredictionEnum.NORMAL
        detection_status = "ANOMALY_CONFIRMED" if is_anomaly else "NOMINAL_TELEMETRY"

        return AnomalyDetectionResponse(
            timestamp=ts,
            host_id=host_id,
            features=features,
            prediction=prediction,
            score=round(norm_score, 4),
            raw_score=round(raw_score, 4),
            severity=severity,
            contributing_metrics=contributing,
            model_version=active_model.version,
            detection_status=detection_status,
            explanation=explanation,
        )


predictor = AnomalyPredictor()
