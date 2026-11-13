from fastapi import APIRouter
from app.api.v1.endpoints import health, system, metrics, logs, anomalies, monitoring

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health & Readiness"])
api_router.include_router(system.router, prefix="/system", tags=["System Diagnostics"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Infrastructure Telemetry"])
api_router.include_router(logs.router, prefix="/logs", tags=["Log Aggregator"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Machine Learning Anomaly Detection"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["Real-Time Host Monitoring Engine"])
