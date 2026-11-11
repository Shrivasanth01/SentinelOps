import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("sentinelops.exceptions")


class SentinelOpsException(Exception):
    """Base exception for all SentinelOps custom exceptions."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_SERVER_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class DatabaseConnectionError(SentinelOpsException):
    """Raised when database connection cannot be established or health check fails."""

    def __init__(
        self,
        message: str = "Database connection could not be established",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="DATABASE_UNAVAILABLE",
            details=details,
        )


class ServiceUnavailableError(SentinelOpsException):
    """Raised when an internal or external dependency is unavailable."""

    def __init__(
        self,
        message: str = "Service is temporarily unavailable",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="SERVICE_UNAVAILABLE",
            details=details,
        )


class ResourceNotFoundError(SentinelOpsException):
    """Raised when a requested resource is not found."""

    def __init__(
        self,
        message: str = "Resource not found",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND",
            details=details,
        )


def _build_error_response(
    status_code: int,
    error_code: str,
    message: str,
    correlation_id: str,
    details: Optional[Any] = None,
) -> JSONResponse:
    content: Dict[str, Any] = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "correlation_id": correlation_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }
    if details:
        content["error"]["details"] = details

    return JSONResponse(status_code=status_code, content=content)


async def sentinel_exception_handler(request: Request, exc: SentinelOpsException) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.error(
        f"Domain error [{exc.error_code}]: {exc.message} (Correlation: {correlation_id})",
        extra={"correlation_id": correlation_id, "path": request.url.path, "method": request.method},
    )
    return _build_error_response(
        status_code=exc.status_code,
        error_code=exc.error_code,
        message=exc.message,
        correlation_id=correlation_id,
        details=exc.details,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.warning(
        f"HTTP {exc.status_code} exception: {exc.detail} (Correlation: {correlation_id})",
        extra={"correlation_id": correlation_id, "path": request.url.path, "method": request.method},
    )
    return _build_error_response(
        status_code=exc.status_code,
        error_code=f"HTTP_{exc.status_code}",
        message=str(exc.detail),
        correlation_id=correlation_id,
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.warning(
        f"Validation error on {request.method} {request.url.path} (Correlation: {correlation_id})",
        extra={"correlation_id": correlation_id, "path": request.url.path, "method": request.method},
    )
    return _build_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        message="Request payload validation failed",
        correlation_id=correlation_id,
        details=exc.errors(),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", "unknown")
    logger.exception(
        f"Unhandled exception on {request.method} {request.url.path}: {str(exc)} (Correlation: {correlation_id})",
        extra={"correlation_id": correlation_id, "path": request.url.path, "method": request.method},
    )
    return _build_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="INTERNAL_SERVER_ERROR",
        message="An unexpected internal server error occurred",
        correlation_id=correlation_id,
    )

