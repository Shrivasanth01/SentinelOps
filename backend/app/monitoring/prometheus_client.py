import logging
from typing import Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("sentinelops.monitoring.prometheus_client")


class PrometheusError(Exception):
    """Base exception for Prometheus communication issues."""
    pass


class PrometheusConnectionError(PrometheusError):
    """Raised when Prometheus server cannot be reached."""
    pass


class PrometheusQueryError(PrometheusError):
    """Raised when Prometheus returns a query execution error."""
    pass


class PrometheusClient:
    """
    Asynchronous client for interacting with Prometheus HTTP API v1.
    Handles instant queries, range queries, target scraping health, and connectivity probes.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.base_url = (base_url or settings.PROMETHEUS_URL).rstrip("/")
        self.timeout = timeout or settings.PROMETHEUS_TIMEOUT_SECONDS

    async def check_health(self) -> bool:
        """Checks if Prometheus server is online and healthy."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(f"{self.base_url}/-/healthy")
                return resp.status_code == 200
        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.warning(f"Prometheus health check failed at {self.base_url}: {exc}")
            return False

    async def query(self, expr: str, time: Optional[float] = None) -> dict[str, Any]:
        """
        Executes an instant PromQL query via GET /api/v1/query.
        Returns parsed JSON 'data' block or raises PrometheusError.
        """
        url = f"{self.base_url}/api/v1/query"
        params: dict[str, Any] = {"query": expr}
        if time is not None:
            params["time"] = time

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    raise PrometheusQueryError(
                        f"Prometheus HTTP {resp.status_code}: {resp.text}"
                    )
                data = resp.json()
                if data.get("status") != "success":
                    error_msg = data.get("error", "Unknown Prometheus query error")
                    raise PrometheusQueryError(f"Prometheus returned error status: {error_msg}")
                return data.get("data", {})
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.error(f"Failed to connect to Prometheus at {self.base_url}: {exc}")
            raise PrometheusConnectionError(
                f"Cannot connect to Prometheus at {self.base_url}. Service may be offline."
            ) from exc
        except httpx.RequestError as exc:
            logger.error(f"Prometheus query request failed: {exc}")
            raise PrometheusQueryError(f"Prometheus request failed: {exc}") from exc

    async def query_range(
        self,
        expr: str,
        start: float,
        end: float,
        step: str = "15s",
    ) -> dict[str, Any]:
        """
        Executes a range PromQL query via GET /api/v1/query_range.
        Returns parsed JSON 'data' block.
        """
        url = f"{self.base_url}/api/v1/query_range"
        params = {
            "query": expr,
            "start": start,
            "end": end,
            "step": step,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params)
                if resp.status_code != 200:
                    raise PrometheusQueryError(
                        f"Prometheus HTTP {resp.status_code}: {resp.text}"
                    )
                data = resp.json()
                if data.get("status") != "success":
                    error_msg = data.get("error", "Unknown Prometheus range query error")
                    raise PrometheusQueryError(f"Prometheus returned error status: {error_msg}")
                return data.get("data", {})
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.error(f"Failed to connect to Prometheus at {self.base_url}: {exc}")
            raise PrometheusConnectionError(
                f"Cannot connect to Prometheus at {self.base_url} for range query."
            ) from exc
        except httpx.RequestError as exc:
            raise PrometheusQueryError(f"Prometheus range request error: {exc}") from exc

    async def get_targets(self) -> dict[str, Any]:
        """
        Retrieves scrape targets status from GET /api/v1/targets.
        """
        url = f"{self.base_url}/api/v1/targets"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    raise PrometheusQueryError(f"Prometheus targets HTTP {resp.status_code}")
                data = resp.json()
                if data.get("status") != "success":
                    raise PrometheusQueryError("Failed to fetch Prometheus targets")
                return data.get("data", {})
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.warning(f"Could not reach Prometheus targets API at {self.base_url}: {exc}")
            raise PrometheusConnectionError(f"Prometheus unavailable at {self.base_url}") from exc
        except httpx.RequestError as exc:
            raise PrometheusQueryError(f"Prometheus targets request failed: {exc}") from exc

    @staticmethod
    def extract_single_value(data: dict[str, Any]) -> Optional[float]:
        """Safely extracts a single float value from a vector or scalar query response."""
        result_type = data.get("resultType")
        result = data.get("result", [])
        if not result:
            return None

        if result_type == "vector" and len(result) > 0:
            val_tuple = result[0].get("value")
            if val_tuple and len(val_tuple) == 2:
                try:
                    return float(val_tuple[1])
                except (ValueError, TypeError):
                    return None
        elif result_type == "scalar":
            val_tuple = result
            if val_tuple and len(val_tuple) == 2:
                try:
                    return float(val_tuple[1])
                except (ValueError, TypeError):
                    return None
        return None
