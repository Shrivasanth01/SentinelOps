import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

from app.core.config import settings
from app.logging_engine.schemas.logs import LogEntry, LogLevelEnum

logger = logging.getLogger("sentinelops.logging.loki_client")


class LokiError(Exception):
    """Base exception for Loki client communication errors."""
    pass


class LokiConnectionError(LokiError):
    """Raised when connection to Loki cannot be established."""
    pass


class LokiClient:
    """
    Asynchronous client for Grafana Loki HTTP API v1.
    Communicates with /ready, /loki/api/v1/query_range, /loki/api/v1/query, and /loki/api/v1/push.
    """

    def __init__(self, base_url: Optional[str] = None, timeout_seconds: Optional[float] = None):
        self.base_url = (base_url or settings.LOKI_URL).rstrip("/")
        self.timeout = timeout_seconds or settings.LOKI_TIMEOUT_SECONDS

    async def check_health(self) -> tuple[bool, Optional[float]]:
        """
        Probes Loki /ready endpoint.
        Returns: (is_healthy, latency_ms)
        """
        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(f"{self.base_url}/ready")
                latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
                is_ready = resp.status_code == 200 and "ready" in resp.text.lower()
                return is_ready, latency_ms
        except Exception as exc:
            latency_ms = round((time.perf_counter() - start) * 1000.0, 2)
            logger.debug(f"Loki health probe failed ({latency_ms}ms): {exc}")
            return False, latency_ms

    async def push_logs(self, entries: List[LogEntry]) -> bool:
        """
        Pushes a list of LogEntry items to Loki /loki/api/v1/push using stable low-cardinality labels.
        Labels: job, service, level, environment.
        High-cardinality fields are placed in structured log payloads.
        """
        if not entries:
            return True

        # Group by label streams: (job, service, level)
        streams_map: Dict[tuple, List[List[str]]] = {}

        for e in entries:
            stream_key = (
                e.source.lower(),
                e.service.lower(),
                e.level.value,
                settings.ENVIRONMENT,
            )
            if stream_key not in streams_map:
                streams_map[stream_key] = []

            # Loki stream format: [nanosecond_timestamp_str, log_line_str]
            ns_timestamp = str(int(e.timestamp.timestamp() * 1e9))
            # Format as JSON payload line
            payload = {
                "id": e.id,
                "message": e.message,
                "service": e.service,
                "level": e.level.value,
                "correlation_id": e.correlation_id,
                "event_id": e.event_id,
                "provider": e.provider,
                "channel": e.channel_or_file,
                "metadata": e.metadata,
            }
            streams_map[stream_key].append([ns_timestamp, json.dumps(payload)])

        # Construct Loki JSON payload
        streams_payload = []
        for (job, service, level, env), values in streams_map.items():
            streams_payload.append({
                "stream": {
                    "job": job,
                    "service": service,
                    "level": level,
                    "environment": env,
                },
                "values": values,
            })

        body = {"streams": streams_payload}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/loki/api/v1/push",
                    json=body,
                    headers={"Content-Type": "application/json"},
                )
                return resp.status_code in (200, 204)
        except Exception as exc:
            logger.debug(f"Failed to push logs to Loki: {exc}")
            return False

    async def query_range(
        self,
        query: str,
        start_ns: Optional[int] = None,
        end_ns: Optional[int] = None,
        limit: int = 100,
        direction: str = "BACKWARD",
    ) -> Dict[str, Any]:
        """
        Executes a LogQL range query via GET /loki/api/v1/query_range.
        """
        params: Dict[str, Any] = {
            "query": query,
            "limit": limit,
            "direction": direction,
        }
        if start_ns:
            params["start"] = str(start_ns)
        if end_ns:
            params["end"] = str(end_ns)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{self.base_url}/loki/api/v1/query_range",
                    params=params,
                )
                if resp.status_code != 200:
                    raise LokiError(f"Loki query failed with HTTP {resp.status_code}: {resp.text}")
                return resp.json().get("data", {})
        except httpx.RequestError as exc:
            raise LokiConnectionError(f"Failed to communicate with Loki at {self.base_url}: {exc}") from exc

    def parse_loki_streams_to_entries(self, data: Dict[str, Any]) -> List[LogEntry]:
        """
        Translates Loki stream results into a normalized list of LogEntry models.
        """
        entries: List[LogEntry] = []
        result_type = data.get("resultType")
        results = data.get("result", [])

        if result_type != "streams":
            return entries

        for stream in results:
            stream_labels = stream.get("stream", {})
            level_str = stream_labels.get("level", "INFO").upper()
            try:
                level = LogLevelEnum(level_str)
            except ValueError:
                level = LogLevelEnum.INFO

            service_label = stream_labels.get("service") or stream_labels.get("job") or "unknown"
            source_label = stream_labels.get("job", "LOKI").upper()

            values = stream.get("values", [])
            for val in values:
                if len(val) >= 2:
                    ts_ns_str, line = val[0], val[1]
                    try:
                        ts_epoch = int(ts_ns_str) / 1e9
                        ts = datetime.fromtimestamp(ts_epoch, timezone.utc)
                    except Exception:
                        ts = datetime.now(timezone.utc)

                    # Try to unpack JSON payload if formatted by SentinelOps
                    entry_id = f"loki-{ts_ns_str[-8:]}"
                    msg = line
                    event_id = None
                    provider = None
                    correlation_id = None
                    meta: Dict[str, Any] = {}

                    try:
                        parsed = json.loads(line)
                        if isinstance(parsed, dict):
                            msg = parsed.get("message") or msg
                            entry_id = parsed.get("id") or entry_id
                            event_id = parsed.get("event_id")
                            provider = parsed.get("provider")
                            correlation_id = parsed.get("correlation_id")
                            meta = parsed.get("metadata") or {}
                    except Exception:
                        pass

                    entries.append(
                        LogEntry(
                            id=entry_id,
                            timestamp=ts,
                            level=level,
                            service=service_label,
                            message=msg,
                            source=source_label,
                            event_id=event_id,
                            provider=provider,
                            correlation_id=correlation_id,
                            metadata=meta,
                            raw=line,
                        )
                    )

        # Sort descending by timestamp
        entries.sort(key=lambda x: x.timestamp, reverse=True)
        return entries

