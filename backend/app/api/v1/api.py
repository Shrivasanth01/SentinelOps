from fastapi import APIRouter
from app.api.v1.endpoints import health, system

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health & Readiness"])
api_router.include_router(system.router, prefix="/system", tags=["System Diagnostics"])

