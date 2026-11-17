from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    system,
    metrics,
    logs,
    anomalies,
    monitoring,
    analytics,
    services,
    topology,
    ml,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health & Readiness"])
api_router.include_router(system.router, prefix="/system", tags=["System Diagnostics"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Infrastructure Telemetry"])
api_router.include_router(logs.router, prefix="/logs", tags=["Log Aggregator"])
api_router.include_router(anomalies.router, prefix="/anomalies", tags=["Machine Learning Anomaly Detection (Legacy)"])
api_router.include_router(ml.router, prefix="/ml", tags=["Machine Learning Anomaly Detection Engine (Phase 5)"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["Real-Time Host Monitoring Engine"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Telemetry Analytics & Historical Intelligence"])
api_router.include_router(services.router, prefix="/services", tags=["Service Availability & Blackbox Monitoring"])
api_router.include_router(topology.router, prefix="/topology", tags=["Infrastructure Topology Mesh"])
