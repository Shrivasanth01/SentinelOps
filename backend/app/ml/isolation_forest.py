import logging
import numpy as np
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Any, Optional
from sklearn.ensemble import IsolationForest

from app.schemas.metrics import HostMetricsSnapshot
from app.schemas.anomalies import AnomalyEvent, AnomalySeverityEnum, AnomalyScoreResponse

logger = logging.getLogger("sentinelops.ml.isolation_forest")

FEATURE_NAMES = [
    "cpu_percent",
    "memory_percent",
    "disk_percent",
    "network_tx_rate",
    "network_rx_rate",
    "process_count",
]


class AnomalyDetector:
    """
    Unsupervised Anomaly Detection engine utilizing Scikit-Learn Isolation Forest.
    Analyzes multi-dimensional host telemetry to flag behavioral shifts, resource exhaustion,
    and abnormal traffic bursts.
    """

    def __init__(self, contamination: float = 0.05, n_estimators: int = 100):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.model: Optional[IsolationForest] = None
        self.is_trained: bool = False
        self.sample_count: int = 0
        self._feature_means: np.ndarray = np.zeros(len(FEATURE_NAMES))
        self._feature_stds: np.ndarray = np.ones(len(FEATURE_NAMES))

    @staticmethod
    def extract_features(snapshot: HostMetricsSnapshot) -> List[float]:
        disk_pct = snapshot.disk.partitions[0].percent if snapshot.disk.partitions else 0.0
        return [
            float(snapshot.cpu.overall_percent),
            float(snapshot.memory.percent),
            float(disk_pct),
            float(snapshot.network.bytes_sent_rate_per_sec),
            float(snapshot.network.bytes_recv_rate_per_sec),
            float(snapshot.system.process_count),
        ]

    def train(self, snapshots: List[HostMetricsSnapshot]) -> bool:
        """Trains or re-trains the Isolation Forest model on historical snapshots."""
        if not snapshots:
            logger.warning("Cannot train Isolation Forest: snapshots list is empty.")
            return False

        data = [self.extract_features(s) for s in snapshots]
        X = np.array(data)

        # If we have very few real samples, bootstrap with small random perturbations of the current baseline
        if len(X) < 15:
            base_row = X[-1] if len(X) > 0 else np.array([20.0, 45.0, 30.0, 1024.0, 2048.0, 120.0])
            noise = np.random.normal(0, [5.0, 3.0, 1.0, 500.0, 1000.0, 10.0], (40, len(FEATURE_NAMES)))
            X = np.clip(base_row + noise, a_min=0, a_max=None)

        self._feature_means = np.mean(X, axis=0)
        self._feature_stds = np.std(X, axis=0)
        # Avoid division by zero
        self._feature_stds = np.where(self._feature_stds == 0, 1.0, self._feature_stds)

        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=42,
        )
        self.model.fit(X)
        self.is_trained = True
        self.sample_count = len(X)
        logger.info(f"Isolation Forest trained successfully on {self.sample_count} feature vectors.")
        return True

    def score_snapshot(self, snapshot: HostMetricsSnapshot) -> Tuple[float, bool, List[str], AnomalySeverityEnum]:
        """
        Calculates normalized anomaly score [0.0 - 1.0], boolean flag,
        and contributing metrics.
        """
        features = np.array([self.extract_features(snapshot)])

        if not self.is_trained or self.model is None:
            # Self-bootstrap using current snapshot
            self.train([snapshot])

        raw_score = self.model.decision_function(features)[0]  # Higher = normal, Lower = anomaly
        prediction = self.model.predict(features)[0]            # -1 = anomaly, 1 = normal

        # Normalize raw decision function to [0.0 - 1.0] risk score (1.0 = most anomalous)
        # Decision function is typically in range [-0.5, 0.5]
        normalized_score = float(np.clip(0.5 - (raw_score * 1.5), 0.0, 1.0))
        is_anomaly = bool(prediction == -1 or normalized_score >= 0.70)

        # Determine contributing deviating metrics using z-score distance
        z_scores = np.abs((features[0] - self._feature_means) / self._feature_stds)
        contributing = []
        for idx, (name, z) in enumerate(zip(FEATURE_NAMES, z_scores)):
            if z >= 2.0 or (name == "cpu_percent" and features[0][idx] > 85.0) or (name == "memory_percent" and features[0][idx] > 90.0):
                friendly_name = name.replace("_", " ").title()
                contributing.append(friendly_name)

        # Assign severity
        if normalized_score >= 0.85:
            severity = AnomalySeverityEnum.CRITICAL
        elif normalized_score >= 0.70:
            severity = AnomalySeverityEnum.HIGH
        elif normalized_score >= 0.50:
            severity = AnomalySeverityEnum.MEDIUM
        else:
            severity = AnomalySeverityEnum.LOW

        return round(normalized_score, 3), is_anomaly, contributing, severity

    def analyze(self, snapshot: HostMetricsSnapshot) -> AnomalyScoreResponse:
        score, is_anomaly, contributing, severity = self.score_snapshot(snapshot)
        status = "CRITICAL_ANOMALY" if severity == AnomalySeverityEnum.CRITICAL else (
            "ANOMALY_DETECTED" if is_anomaly else "NORMAL"
        )
        return AnomalyScoreResponse(
            score=score,
            is_anomaly=is_anomaly,
            status=status,
            severity=severity,
            contributing_metrics=contributing,
            model_trained=self.is_trained,
            baseline_samples=self.sample_count,
            timestamp=snapshot.timestamp,
        )


anomaly_detector = AnomalyDetector()

