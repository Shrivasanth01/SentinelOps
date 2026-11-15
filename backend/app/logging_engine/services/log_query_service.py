import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.core.config import settings
from app.logging_engine.collectors.fastapi_logger import fastapi_log_buffer
from app.logging_engine.collectors.windows_events import WindowsEventCollector
from app.logging_engine.parsers.error_grouper import group_error_logs
from app.logging_engine.parsers.windows_event_parser import map_windows_level
from app.logging_engine.queries.logql_builder import LogQLBuilder
from app.logging_engine.schemas.logs import (
    ErrorGroup,
    ErrorIntelligenceResponse,
    LogEntry,
    LogHealthResponse,
    LogLevelEnum,
    LogSearchResult,
    LogSummaryResponse,
    LogTimelineResponse,
    TimelineBucket,
)
from app.logging_engine.services.loki_client import LokiClient, LokiError

logger = logging.getLogger("sentinelops.logging.services.query")


def parse_duration_to_nanoseconds(time_range: str) -> tuple[int, int]:
    """
    Translates duration string (15m, 1h, 6h, 24h, 7d) to (start_ns, end_ns).
    """
    now = datetime.now(timezone.utc).timestamp()
    mapping = {
        "15m": 900,
        "1h": 3600,
        "6h": 21600,
        "24h": 86400,
        "7d": 604800,
    }
    sec = mapping.get(time_range.lower(), 3600)
    start_ns = int((now - sec) * 1e9)
    end_ns = int(now * 1e9)
    return start_ns, end_ns


class LogQueryService:
    def __init__(self, loki_client: Optional[LokiClient] = None):
        self.loki = loki_client or LokiClient()
        self.windows_collector = WindowsEventCollector()

    async def query_logs(
        self,
        level: Optional[LogLevelEnum] = None,
        service: Optional[str] = None,
        source: Optional[str] = None,
        search: Optional[str] = None,
        time_range: str = "1h",
        limit: int = 50,
        offset: int = 0,
    ) -> LogSearchResult:
        """
        Coordinates log queries across Loki and local collectors with structured filtering.
        """
        start_time = time.perf_counter()
        start_ns, end_ns = parse_duration_to_nanoseconds(time_range)

        logql = LogQLBuilder.build_stream_query(
            service=service,
            level=level,
            search=search,
        )

        entries: List[LogEntry] = []
        loki_online = False

        # 1. Try Loki Query
        try:
            data = await self.loki.query_range(
                query=logql,
                start_ns=start_ns,
                end_ns=end_ns,
                limit=limit + offset + 50,
            )
            entries = self.loki.parse_loki_streams_to_entries(data)
            loki_online = True
        except LokiError as exc:
            logger.debug(f"Loki query bypassed/failed: {exc}. Utilizing local telemetry buffer & collectors.")

        # 2. Incorporate live local FastAPI buffer
        buffer_entries = fastapi_log_buffer.get_recent(limit=200, level=level, service=service)
        entries.extend(buffer_entries)

        # 3. If Windows source requested or buffer is small, query host Windows events
        if source in ("WINDOWS_EVENT", "windows", None) and (not service or "windows" in service.lower()):
            try:
                win_system = await self.windows_collector.collect_events(channel="System", max_events=25)
                win_apps = await self.windows_collector.collect_events(channel="Application", max_events=25)
                entries.extend(win_system)
                entries.extend(win_apps)
            except Exception as exc:
                logger.debug(f"Windows Event query skipped: {exc}")

        # 4. Filter in-memory
        filtered: List[LogEntry] = []
        seen_ids = set()

        for e in entries:
            if e.id in seen_ids:
                continue
            seen_ids.add(e.id)

            if level and e.level != level:
                continue
            if service and service.lower() not in e.service.lower():
                continue
            if source and source.upper() not in e.source.upper():
                continue
            if search:
                query_lower = search.lower()
                if query_lower not in e.message.lower() and query_lower not in e.service.lower():
                    continue

            filtered.append(e)

        # Sort descending by timestamp
        filtered.sort(key=lambda x: x.timestamp, reverse=True)

        total = len(filtered)
        paginated = filtered[offset : offset + limit]
        exec_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return LogSearchResult(
            logs=paginated,
            total=total,
            total_count=total,
            limit=limit,
            offset=offset,
            has_more=(offset + limit) < total,
            query_used=logql,
            time_range=time_range,
            execution_time_ms=exec_ms,
            loki_connected=loki_online,
        )

    async def get_summary(self, time_range: str = "24h") -> LogSummaryResponse:
        """Calculates severity and service distributions across recent logs."""
        res = await self.query_logs(time_range=time_range, limit=500)
        logs = res.logs

        level_dist: Dict[str, int] = {lvl.value: 0 for lvl in LogLevelEnum}
        service_dist: Dict[str, int] = {}

        for l in logs:
            level_dist[l.level.value] = level_dist.get(l.level.value, 0) + 1
            service_dist[l.service] = service_dist.get(l.service, 0) + 1

        error_count = level_dist.get("ERROR", 0) + level_dist.get("CRITICAL", 0)
        total = len(logs)
        err_rate = round((error_count / total * 100.0), 2) if total > 0 else 0.0

        is_loki_healthy, _ = await self.loki.check_health()

        return LogSummaryResponse(
            total_logs=total,
            level_distribution=level_dist,
            service_distribution=service_dist,
            recent_error_rate=err_rate,
            collection_health="HEALTHY" if is_loki_healthy or total > 0 else "DEGRADED",
        )

    async def get_timeline(self, time_range: str = "1h", bucket_count: int = 12) -> LogTimelineResponse:
        """Generates chronological volume buckets across the requested time window."""
        now = datetime.now(timezone.utc).timestamp()
        start_ns, _ = parse_duration_to_nanoseconds(time_range)
        start_epoch = start_ns / 1e9
        span = now - start_epoch
        bucket_size = max(10, int(span / bucket_count))

        # Query all logs in window
        res = await self.query_logs(time_range=time_range, limit=1000)

        # Initialize empty buckets
        buckets: List[TimelineBucket] = []
        for i in range(bucket_count):
            b_start = start_epoch + i * bucket_size
            b_dt = datetime.fromtimestamp(b_start, timezone.utc)
            buckets.append(
                TimelineBucket(
                    timestamp=b_start,
                    time_label=b_dt.strftime("%H:%M:%S"),
                    count=0,
                    error_count=0,
                    warning_count=0,
                    info_count=0,
                )
            )

        for l in res.logs:
            l_ts = l.timestamp.timestamp()
            if l_ts < start_epoch or l_ts > now:
                continue
            idx = int((l_ts - start_epoch) / bucket_size)
            if 0 <= idx < bucket_count:
                buckets[idx].count += 1
                if l.level in (LogLevelEnum.ERROR, LogLevelEnum.CRITICAL):
                    buckets[idx].error_count += 1
                elif l.level == LogLevelEnum.WARNING:
                    buckets[idx].warning_count += 1
                else:
                    buckets[idx].info_count += 1

        return LogTimelineResponse(
            buckets=buckets,
            start_time=start_epoch,
            end_time=now,
            bucket_size_seconds=bucket_size,
            total_events=len(res.logs),
        )

    async def get_error_intelligence(self, time_range: str = "24h") -> ErrorIntelligenceResponse:
        """Groups errors into normalized patterns and frequency analytics."""
        res = await self.query_logs(time_range=time_range, limit=500)
        groups = group_error_logs(res.logs)
        total_errors = sum(g.count for g in groups)

        return ErrorIntelligenceResponse(
            total_errors=total_errors,
            unique_patterns=len(groups),
            groups=groups,
        )

    async def check_health(self) -> LogHealthResponse:
        """Checks overall health of Loki, ingestion pipelines, and collectors."""
        is_loki, lat = await self.loki.check_health()
        return LogHealthResponse(
            loki_status="HEALTHY" if is_loki else "OFFLINE",
            loki_url=self.loki.base_url,
            loki_latency_ms=lat,
            sources_configured=3,
            sources_healthy=3 if is_loki else 2,
            ingestion_active=True,
            redaction_enabled=settings.LOG_REDACTION_ENABLED,
        )


log_query_service = LogQueryService()
