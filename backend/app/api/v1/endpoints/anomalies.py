from fastapi import APIRouter, Query
from app.services.anomaly_service import anomaly_service
from app.schemas.anomalies import (
    AnomalyScoreResponse,
    AnomalyHistoryResponse,
    ModelTrainResponse,
    AnomalyEvent,
    AnomalySeverityEnum,
)
import uuid
from datetime import datetime, timezone

router = APIRouter()


@router.get(
    "/score",
    response_model=AnomalyScoreResponse,
    summary="Evaluate Current Host Anomaly Risk",
    description="Scores current real-time metrics with the Isolation Forest model.",
)
async def get_anomaly_score() -> AnomalyScoreResponse:
    return anomaly_service.evaluate_current()


@router.get(
    "/recent",
    response_model=AnomalyHistoryResponse,
    summary="Retrieve Flagged Anomaly Events",
    description="Returns recent historical anomaly events with severity and contributing metrics.",
)
async def get_recent_anomalies(
    limit: int = Query(20, ge=1, le=100, description="Number of anomalies to retrieve")
) -> AnomalyHistoryResponse:
    return anomaly_service.get_recent_anomalies(limit=limit)


@router.post(
    "/retrain",
    response_model=ModelTrainResponse,
    summary="Retrain Isolation Forest Model",
    description="Re-fits the Isolation Forest detector on accumulated historical telemetry.",
)
async def retrain_anomaly_model() -> ModelTrainResponse:
    return anomaly_service.retrain_model()


@router.post(
    "/simulate",
    response_model=AnomalyEvent,
    summary="Simulate High-Contamination Anomaly",
    description="Simulates an anomaly event to verify operator alerting workflows.",
)
async def simulate_anomaly(
    severity: AnomalySeverityEnum = Query(AnomalySeverityEnum.HIGH),
    metric: str = Query("Cpu Percent"),
) -> AnomalyEvent:
    event = AnomalyEvent(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc),
        score=0.82,
        is_anomaly=True,
        severity=severity,
        contributing_metrics=[metric, "Process Count"],
        description=f"Simulated operational anomaly: Abnormal deviation on {metric}.",
        resolved=False,
    )
    anomaly_service._anomalies_buffer.appendleft(event)
    return event
