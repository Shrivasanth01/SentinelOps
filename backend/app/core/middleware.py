import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("sentinelops.access")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Middleware that assigns a unique Correlation ID to each incoming request,
    tracks request latency, and appends diagnostic telemetry headers to the response.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Extract or generate correlation ID
        correlation_id = request.headers.get("X-Correlation-ID") or request.headers.get("X-Request-ID")
        if not correlation_id:
            correlation_id = str(uuid.uuid4())

        request.state.correlation_id = correlation_id

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                f"{request.method} {request.url.path} failed after {duration_ms}ms",
                extra={
                    "correlation_id": correlation_id,
                    "path": request.url.path,
                    "method": request.method,
                    "duration_ms": duration_ms,
                },
            )
            raise

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Response-Time-MS"] = str(duration_ms)

        # Log request summary
        logger.info(
            f"{request.method} {request.url.path} {response.status_code} in {duration_ms}ms",
            extra={
                "correlation_id": correlation_id,
                "path": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )

        return response

