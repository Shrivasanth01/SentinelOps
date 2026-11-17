import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
from sklearn.ensemble import IsolationForest
from app.ml.features.normalization import FeatureScaler
from app.ml.config import MLConfig

logger = logging.getLogger("sentinelops.ml.models.isolation_forest")


class IsolationForestModel:
    """
    Production-grade Unsupervised Isolation Forest model pipeline.
    Combines zero-variance guarded feature scaling with scikit-learn IsolationForest.
    Generates both raw decision scores and calibrated normalized risk scores.
    """

    def __init__(
        self,
        n_estimators: int = MLConfig.DEFAULT_N_ESTIMATORS,
        contamination: float = MLConfig.DEFAULT_CONTAMINATION,
        random_state: int = MLConfig.DEFAULT_RANDOM_STATE,
        version: Optional[str] = None,
    ):
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.random_state = random_state
        self.version = version or f"isoforest-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

        self.scaler = FeatureScaler()
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1,
        )

        self.is_fitted = False
        self.feature_names: List[str] = []
        self.training_sample_count: int = 0
        self.fitted_at: Optional[datetime] = None
        self.score_quantiles: Dict[str, float] = {}

    def fit(self, X: np.ndarray, feature_names: List[str]) -> "IsolationForestModel":
        """Fits scaler and Isolation Forest on training feature matrix."""
        if len(X) < 5:
            raise ValueError(f"Insufficient samples to fit Isolation Forest: got {len(X)} rows.")

        self.feature_names = list(feature_names)
        self.training_sample_count = len(X)

        # 1. Fit & transform scaler
        X_scaled = self.scaler.fit_transform(X, self.feature_names)

        # 2. Fit Isolation Forest
        self.model.fit(X_scaled)
        self.is_fitted = True
        self.fitted_at = datetime.now(timezone.utc)

        # 3. Calculate baseline score distribution quantiles
        raw_scores = self.model.decision_function(X_scaled)
        self.score_quantiles = {
            "p01": float(np.percentile(raw_scores, 1)),
            "p05": float(np.percentile(raw_scores, 5)),
            "p25": float(np.percentile(raw_scores, 25)),
            "p50": float(np.percentile(raw_scores, 50)),
            "p75": float(np.percentile(raw_scores, 75)),
            "p95": float(np.percentile(raw_scores, 95)),
            "min": float(np.min(raw_scores)),
            "max": float(np.max(raw_scores)),
            "mean": float(np.mean(raw_scores)),
            "std": float(np.std(raw_scores)),
        }

        logger.info(
            f"IsolationForestModel {self.version} fitted on {self.training_sample_count} samples. "
            f"Mean score: {self.score_quantiles['mean']:.4f}, Contamination: {self.contamination}"
        )
        return self

    def predict_raw(self, X: np.ndarray) -> np.ndarray:
        """Raw prediction: 1 = normal, -1 = anomalous."""
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before predict.")
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)

    def decision_function(self, X: np.ndarray) -> np.ndarray:
        """
        Raw decision score from scikit-learn.
        Higher = normal, Lower / negative = anomalous.
        """
        if not self.is_fitted:
            raise RuntimeError("Model must be fitted before decision_function.")
        X_scaled = self.scaler.transform(X)
        return self.model.decision_function(X_scaled)

    def score_samples(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Calculates raw scores, normalized [0.0 - 1.0] risk scores, and boolean anomaly flags.
        Formula:
          s_norm = clip(0.5 - (raw_score * 1.5), 0.0, 1.0)
          where 1.0 = most anomalous, 0.0 = deeply normal.
        """
        raw = self.decision_function(X)
        preds = self.predict_raw(X)

        # Calibrate score to [0.0 - 1.0]
        # In scikit-learn, decision_function is around 0.0 at the contamination boundary.
        # Negative values are outliers. Multiplying by 1.5 spreads the typical [-0.3, 0.3] range.
        normalized = np.clip(0.5 - (raw * 1.5), 0.0, 1.0)
        is_anomaly = (preds == -1) | (normalized >= MLConfig.ANOMALY_SCORE_THRESHOLD)

        return raw, normalized, is_anomaly
