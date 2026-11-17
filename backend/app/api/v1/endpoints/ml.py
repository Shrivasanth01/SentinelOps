import logging
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.ml.schemas.anomaly import (
    AnomalyAcknowledgeRequest,
    AnomalyDetectionRequest,
    AnomalyDetectionResponse,
    AnomalyEvent,
    AnomalyListResponse,
    AnomalySummaryResponse,
    AnomalyTimelineResponse,
)
from app.ml.schemas.model import (
    FeatureSchemaResponse,
    MLStatusResponse,
    ModelEvaluationResponse,
    ModelListResponse,
    ModelMetadata,
    ModelTrainRequest,
    ModelTrainResponse,
)
from app.ml.services.anomaly_service import anomaly_service
from app.ml.services.model_service import model_service

logger = logging.getLogger("sentinelops.api.v1.ml")

router = APIRouter()


# ==============================================================================
# ML Subsystem Status & Features
# ==============================================================================

@router.get(
    "/status",
    response_model=MLStatusResponse,
    summary="ML Subsystem Operational Status",
    description="Retrieves overall ML engine status, active model version, Prometheus connection, and observation counts.",
)
async def get_ml_status(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> MLStatusResponse:
    return await model_service.get_status(session)


@router.get(
    "/features",
    response_model=FeatureSchemaResponse,
    summary="List Engineered Telemetry Features",
    description="Returns metadata, definitions, units, and formulas for all base and dynamic features.",
)
async def get_features_schema() -> FeatureSchemaResponse:
    return model_service.get_features_schema()


# ==============================================================================
# Model Registry & Training Endpoints
# ==============================================================================

@router.get(
    "/models",
    response_model=ModelListResponse,
    summary="List Registered Model Versions",
    description="Retrieves all registered Isolation Forest models, training parameters, sample counts, and active status.",
)
async def list_models(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ModelListResponse:
    return await model_service.list_models(session)


@router.get(
    "/models/{model_id}",
    response_model=ModelMetadata,
    summary="Get Model Details",
    description="Fetches detailed hyperparameters, training time window, and evaluation metrics for a specific model.",
)
async def get_model(
    model_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ModelMetadata:
    meta = await model_service.get_model(session, model_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_id}' not found in registry",
        )
    return meta


@router.post(
    "/models/train",
    response_model=ModelTrainResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Train New Isolation Forest Model",
    description="Triggers end-to-end model training using historical Prometheus telemetry data.",
)
async def train_model(
    request: ModelTrainRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ModelTrainResponse:
    try:
        return await model_service.train_model(session, request)
    except Exception as exc:
        logger.error(f"Model training failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Model training execution failed: {str(exc)}",
        )


@router.post(
    "/models/{model_id}/evaluate",
    response_model=ModelEvaluationResponse,
    summary="Evaluate Model on Holdout Telemetry",
    description="Generates an unsupervised evaluation report showing score distribution quantiles and stability.",
)
async def evaluate_model(
    model_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ModelEvaluationResponse:
    eval_resp = await model_service.evaluate_model(session, model_id)
    if not eval_resp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_id}' not found for evaluation",
        )
    return eval_resp


@router.post(
    "/models/{model_id}/activate",
    response_model=ModelMetadata,
    summary="Activate / Rollback Model Version",
    description="Hot-swaps the active model in memory with zero-downtime and updates registry records.",
)
async def activate_model(
    model_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ModelMetadata:
    meta = await model_service.activate_model(session, model_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model '{model_id}' not found for activation",
        )
    return meta


# ==============================================================================
# Anomaly Detection & Investigation Endpoints
# ==============================================================================

@router.post(
    "/detect",
    response_model=AnomalyDetectionResponse,
    summary="Execute Real-Time Anomaly Inference",
    description="Scores current real-time host telemetry (or manual feature payload) using the active Isolation Forest model.",
)
async def detect_anomaly(
    request: Optional[AnomalyDetectionRequest] = None,
    session: Annotated[AsyncSession, Depends(get_db)] = None,
) -> AnomalyDetectionResponse:
    return await anomaly_service.detect_live(session, request)


@router.get(
    "/anomalies",
    response_model=AnomalyListResponse,
    summary="Query Flagged Anomaly Events",
    description="Retrieves historical anomaly events with severity filtering, pagination, and contributing metrics.",
)
async def list_anomalies(
    severity: Optional[str] = Query(None, description="Filter by severity: CRITICAL, HIGH, MEDIUM, LOW"),
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledgment state"),
    limit: int = Query(50, ge=1, le=200, description="Page limit"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    session: Annotated[AsyncSession, Depends(get_db)] = None,
) -> AnomalyListResponse:
    return await anomaly_service.list_anomalies(
        session=session,
        severity=severity,
        acknowledged=acknowledged,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/anomalies/summary",
    response_model=AnomalySummaryResponse,
    summary="Anomaly Analytics & Severity Summary",
    description="Returns aggregate counts of normal, anomalous, and unknown observations with severity distribution.",
)
async def get_anomalies_summary(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AnomalySummaryResponse:
    return await anomaly_service.get_summary(session)


@router.get(
    "/anomalies/timeline",
    response_model=AnomalyTimelineResponse,
    summary="Chronological Anomaly Distribution Timeline",
    description="Aggregates anomaly occurrences into discrete time buckets across the specified window.",
)
async def get_anomalies_timeline(
    time_range: str = Query("1h", description="Time window: 15m, 1h, 6h, 24h, 7d"),
    buckets: int = Query(12, ge=4, le=60, description="Histogram bucket count"),
    session: Annotated[AsyncSession, Depends(get_db)] = None,
) -> AnomalyTimelineResponse:
    return await anomaly_service.get_timeline(session=session, time_range=time_range, bucket_count=buckets)


@router.get(
    "/anomalies/{anomaly_id}",
    response_model=AnomalyEvent,
    summary="Get Anomaly Event Details",
    description="Retrieves deep investigation details for a flagged anomaly, including captured telemetry snapshot.",
)
async def get_anomaly_detail(
    anomaly_id: str,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AnomalyEvent:
    event = await anomaly_service.get_anomaly(session, anomaly_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomaly event '{anomaly_id}' not found",
        )
    return event


@router.post(
    "/anomalies/{anomaly_id}/acknowledge",
    response_model=AnomalyEvent,
    summary="Acknowledge Anomaly with Operator Notes",
    description="Marks an anomaly event as acknowledged, recording operator identity, timestamp, and investigation findings.",
)
async def acknowledge_anomaly(
    anomaly_id: str,
    request: AnomalyAcknowledgeRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AnomalyEvent:
    event = await anomaly_service.acknowledge_anomaly(session, anomaly_id, request)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomaly event '{anomaly_id}' not found for acknowledgment",
        )
    return event
