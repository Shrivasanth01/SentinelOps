from fastapi import APIRouter
from app.services.health_service import health_service
from app.core.config import settings

router = APIRouter()


@router.get("/config-summary")
async def get_config_summary():
    """
    Returns non-sensitive configuration parameters for frontend display and verification.
    """
    return {
        "project_name": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "api_v1_prefix": settings.API_V1_STR,
        "cors_origins": settings.BACKEND_CORS_ORIGINS,
        "postgres_host": settings.POSTGRES_SERVER,
        "postgres_port": settings.POSTGRES_PORT,
        "postgres_db": settings.POSTGRES_DB,
        "db_pool_size": settings.DB_POOL_SIZE,
        "db_max_overflow": settings.DB_MAX_OVERFLOW,
    }

