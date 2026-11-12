from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.exceptions import (
    SentinelOpsException,
    sentinel_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from app.core.middleware import RequestContextMiddleware
from app.db.session import close_db_connections
from app.api.v1.api import api_router
from app.monitoring import start_metrics_worker, stop_metrics_worker, get_prometheus_output


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager handling graceful startup and shutdown.
    Initializes structured logging, starts telemetry background worker, and cleans up resources.
    """
    setup_logging(environment=settings.ENVIRONMENT, debug=settings.DEBUG)
    logger.info(
        f"Initializing {settings.PROJECT_NAME} v{settings.VERSION} "
        f"[Env: {settings.ENVIRONMENT}, Debug: {settings.DEBUG}]"
    )

    # Start Phase 2 background telemetry sampling worker (unless testing)
    if settings.ENVIRONMENT != "testing":
        start_metrics_worker(interval=5.0)

    yield

    logger.info("Gracefully shutting down SentinelOps...")
    if settings.ENVIRONMENT != "testing":
        await stop_metrics_worker()
    await close_db_connections()
    logger.info("Shutdown complete.")


def create_application() -> FastAPI:
    """
    Application factory initializing FastAPI with routing, middleware, CORS, and exception handlers.
    """
    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=(
            f"{settings.TAGLINE}\n\n"
            "Production-grade Infrastructure Monitoring & AIOps Platform.\n"
            "- Phase 1: Architecture, Health Diagnostics, Containerization, and Persistent Storage.\n"
            "- Phase 2: High-Resolution Host Telemetry, Background Sampling, and Prometheus Metrics."
        ),
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # Correlation ID & telemetry middleware
    app.add_middleware(RequestContextMiddleware)

    # CORS configuration
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.BACKEND_CORS_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Exception Handlers
    app.add_exception_handler(SentinelOpsException, sentinel_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # Register API Routers
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Standard Prometheus scraping target
    @app.get("/metrics", tags=["Observability"], include_in_schema=False)
    async def prometheus_metrics():
        content, content_type = get_prometheus_output()
        return Response(content=content, media_type=content_type)

    # Root redirect / ping
    @app.get("/", tags=["Root"], include_in_schema=False)
    async def root():
        return {
            "name": settings.PROJECT_NAME,
            "tagline": settings.TAGLINE,
            "version": settings.VERSION,
            "docs": f"{settings.API_V1_STR}/docs",
            "health": f"{settings.API_V1_STR}/health/live",
            "readiness": f"{settings.API_V1_STR}/health/ready",
            "metrics": f"{settings.API_V1_STR}/metrics/current",
            "prometheus": "/metrics",
        }

    return app


app = create_application()
