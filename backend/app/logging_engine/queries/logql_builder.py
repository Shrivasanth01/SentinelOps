import re
from typing import List, Optional
from app.logging_engine.schemas.logs import LogLevelEnum


class LogQLBuilder:
    """
    Constructs safe, low-cardinality LogQL queries for Grafana Loki.
    Enforces stable labels ({job, service, environment, level}) and keeps
    arbitrary search terms as line filters (|= or |~).
    """

    ALLOWED_LABELS = {"job", "service", "environment", "level", "channel"}

    @staticmethod
    def escape_logql_string(s: str) -> str:
        """Escapes quotes and backslashes in user-supplied strings for LogQL."""
        return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ").replace("\r", "")

    @classmethod
    def build_stream_query(
        cls,
        job: Optional[str] = None,
        service: Optional[str] = None,
        level: Optional[LogLevelEnum] = None,
        search: Optional[str] = None,
        channel: Optional[str] = None,
    ) -> str:
        """
        Builds a safe LogQL stream query.
        Example: {service="sentinelops-api", level="ERROR"} |= "timeout"
        """
        selectors: List[str] = []

        if job:
            selectors.append(f'job="{cls.escape_logql_string(job)}"')
        if service:
            selectors.append(f'service="{cls.escape_logql_string(service)}"')
        if level:
            selectors.append(f'level="{level.value}"')
        if channel:
            selectors.append(f'channel="{cls.escape_logql_string(channel)}"')

        # Fallback to broad selector if no specific labels provided
        if not selectors:
            stream_selector = '{job=~".+"}'
        else:
            stream_selector = "{" + ", ".join(selectors) + "}"

        query = stream_selector

        # Append search keyword as safe line filter
        if search and search.strip():
            escaped_search = cls.escape_logql_string(search.strip())
            query += f' |= "{escaped_search}"'

        return query

    @classmethod
    def build_metric_query(
        cls,
        operation: str = "rate",
        duration: str = "5m",
        job: Optional[str] = None,
        level: Optional[LogLevelEnum] = None,
    ) -> str:
        """
        Builds a LogQL metric query (e.g. rate or count_over_time).
        Example: sum by (level) (count_over_time({job=~".+"}[5m]))
        """
        stream = cls.build_stream_query(job=job, level=level)
        valid_duration = duration if re.match(r"^\d+[smhd]$", duration) else "5m"

        if operation == "count":
            return f"sum by (level) (count_over_time({stream}[{valid_duration}]))"
        return f"sum by (service) (rate({stream}[{valid_duration}]))"
