import logging
from datetime import datetime, timezone
from typing import List, Optional
from app.logging_engine.schemas.logs import (
    LogCorrelationResponse,
    LogEntry,
    LogLevelEnum,
)
from app.logging_engine.services.log_query_service import log_query_service

logger = logging.getLogger("sentinelops.logging.services.correlation")


class LogCorrelationService:
    """
    Correlates infrastructure metric anomalies / spikes with system and application logs
    occurring within a temporal investigation window (e.g. ±5m or ±10m).

    IMPORTANT ARCHITECTURAL GOVERNANCE:
    Temporal concurrence demonstrates temporal proximity only and does not establish causation.
    """

    async def correlate_metric_with_logs(
        self,
        metric_name: str,
        event_timestamp: float,
        window_seconds: int = 300,  # Default ±5 minutes
        severity_filter: Optional[LogLevelEnum] = None,
        service_filter: Optional[str] = None,
    ) -> LogCorrelationResponse:
        """
        Retrieves logs around the specified metric timestamp within [event_ts - window, event_ts + window].
        """
        start_ts = event_timestamp - window_seconds
        end_ts = event_timestamp + window_seconds

        # Query logs across a window wide enough to cover the range
        # Convert start/end to a duration query
        now_ts = datetime.now(timezone.utc).timestamp()
        duration_needed_sec = max(900, int(now_ts - start_ts) + 120)

        time_range = "15m"
        if duration_needed_sec > 86400:
            time_range = "7d"
        elif duration_needed_sec > 21600:
            time_range = "24h"
        elif duration_needed_sec > 3600:
            time_range = "6h"
        elif duration_needed_sec > 900:
            time_range = "1h"

        res = await log_query_service.query_logs(
            level=severity_filter,
            service=service_filter,
            time_range=time_range,
            limit=500,
        )

        # Filter logs strictly within [start_ts, end_ts]
        correlated: List[LogEntry] = []
        for l in res.logs:
            l_epoch = l.timestamp.timestamp()
            if start_ts <= l_epoch <= end_ts:
                correlated.append(l)

        # Sort chronologically or by proximity to event_timestamp
        correlated.sort(key=lambda x: abs(x.timestamp.timestamp() - event_timestamp))

        error_cnt = sum(1 for l in correlated if l.level in (LogLevelEnum.ERROR, LogLevelEnum.CRITICAL))
        warn_cnt = sum(1 for l in correlated if l.level == LogLevelEnum.WARNING)

        return LogCorrelationResponse(
            metric_name=metric_name,
            metric_event_timestamp=event_timestamp,
            window_seconds=window_seconds,
            start_time=start_ts,
            end_time=end_ts,
            logs=correlated,
            correlated_count=len(correlated),
            error_count=error_cnt,
            warning_count=warn_cnt,
            disclaimer=(
                "Temporal proximity demonstrates concurrence within the specified time window "
                "and does not establish a causal relationship. Root-cause verification requires "
                "subsystem state analysis."
            ),
        )


log_correlation_service = LogCorrelationService()
