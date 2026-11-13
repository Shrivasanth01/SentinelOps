import collections
import logging
import uuid
from datetime import datetime, timezone

from app.schemas.anomalies import (
    AnomalyEvent,
    AnomalySeverityEnum,
    AnomalyScoreResponse,
    AnomalyHistoryResponse,
    ModelTrainResponse,
)
from app.ml.isolation_forest import anomaly_detector
from app.services.metrics_service import metrics_service
from app.models.anomalies import AnomalyEventRecord
from app.db.session import AsyncSessionLocal

logger = logging.getLogger("sentinelops.services.anomalies")


class AnomalyService:
    """
    Coordinates machine learning anomaly detection, score evaluations,
    and historical anomaly event tracking.
    """

    def __init__(self, max_history_size: int = 100):
        self._anomalies_buffer: collections.deque[AnomalyEvent] = collections.deque(maxlen=max_history_size)
        self._seed_initial_anomalies()

    def _seed_initial_anomalies(self) -> None:
        """Seeds initial historical reference anomaly for operator context."""
        now = datetime.now(timezone.utc)
        self._anomalies_buffer.append(
            AnomalyEvent(
                id=str(uuid.uuid4()),
                timestamp=now,
                score=0.74,
                is_anomaly=True,
                severity=AnomalySeverityEnum.HIGH,
                contributing_metrics=["Network Tx Rate", "Cpu Percent"],
                description="Transient traffic burst accompanied by elevated CPU usage (78.4%).",
                resolved=False,
            )
        )

    def evaluate_current(self) -> AnomalyScoreResponse:
        """Scores current host metrics against the Isolation Forest model."""
        snapshot = metrics_service.get_current()
        res = anomaly_detector.analyze(snapshot)

        if res.is_anomaly:
            # Create and buffer an anomaly event
            desc = f"Anomalous metric deviation detected (Risk score: {res.score:.2f})."
            if res.contributing_metrics:
                desc += f" Contributing factors: {', '.join(res.contributing_metrics)}."

            event = AnomalyEvent(
                id=str(uuid.uuid4()),
                timestamp=res.timestamp,
                score=res.score,
                is_anomaly=True,
                severity=res.severity,
                contributing_metrics=res.contributing_metrics,
                description=desc,
                resolved=False,
            )
            self._anomalies_buffer.appendleft(event)

        return res

    def get_recent_anomalies(self, limit: int = 20) -> AnomalyHistoryResponse:
        """Returns recent detected anomaly events."""
        items = list(self._anomalies_buffer)[:limit]
        return AnomalyHistoryResponse(anomalies=items, total_count=len(self._anomalies_buffer))

    async def persist_anomaly_to_db(self, event: AnomalyEvent) -> None:
        """Persists flagged anomaly event to PostgreSQL."""
        from app.core.config import settings

        if settings.ENVIRONMENT == "testing":
            return

        try:
            async with AsyncSessionLocal() as session:
                record = AnomalyEventRecord(
                    id=event.id,
                    timestamp=event.timestamp,
                    score=event.score,
                    is_anomaly=event.is_anomaly,
                    severity=event.severity.value,
                    contributing_metrics=",".join(event.contributing_metrics),
                    description=event.description,
                    resolved=event.resolved,
                )
                session.add(record)
                await session.commit()
        except Exception as exc:
            logger.warning(f"Failed to persist anomaly event to database: {exc}")

    def retrain_model(self) -> ModelTrainResponse:
        """Retrains the Isolation Forest model using all available snapshots in the ring buffer."""
        history = metrics_service.get_history(limit=240)
        success = anomaly_detector.train(history.snapshots)
        return ModelTrainResponse(
            success=success,
            sample_count=anomaly_detector.sample_count,
            contamination=anomaly_detector.contamination,
            message="Isolation Forest model trained and updated." if success else "Failed to train model.",
        )


anomaly_service = AnomalyService()

