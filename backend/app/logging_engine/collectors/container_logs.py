import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional
from app.logging_engine.parsers.json_parser import parse_json_log_line
from app.logging_engine.schemas.logs import LogEntry, LogLevelEnum

logger = logging.getLogger("sentinelops.logging.collectors.container")


class DockerContainerLogCollector:
    """
    Collects logs from SentinelOps Docker containers using the Docker engine.
    Handles Windows Docker Desktop without assuming direct Linux file access.
    """

    KNOWN_CONTAINERS = [
        "sentinelops-backend",
        "sentinelops-postgres",
        "sentinelops-prometheus",
        "sentinelops-loki",
        "sentinelops-blackbox-exporter",
    ]

    async def collect_container_logs(
        self,
        container_name: str,
        tail_lines: int = 50,
    ) -> List[LogEntry]:
        """
        Retrieves recent log output from the specified Docker container via 'docker logs'.
        Returns empty list if Docker is unavailable.
        """
        # Validate container name against alphanumeric + hyphens
        if not container_name.replace("-", "").replace("_", "").isalnum():
            return []

        try:
            proc = await asyncio.create_subprocess_exec(
                "docker",
                "logs",
                "--tail",
                str(tail_lines),
                "--timestamps",
                container_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=5.0)

            if proc.returncode != 0:
                return []

            # Docker writes stdout/stderr combined
            output = stdout.decode("utf-8", errors="ignore") + stderr.decode("utf-8", errors="ignore")
            lines = output.strip().splitlines()

            entries: List[LogEntry] = []
            for line in lines:
                if not line.strip():
                    continue

                # Parse timestamp prefix (Docker format: 2026-11-15T10:00:00.123456789Z message)
                parts = line.split(" ", 1)
                ts = datetime.now(timezone.utc)
                msg = line
                if len(parts) == 2:
                    ts_str, remainder = parts
                    try:
                        # Truncate fractional seconds to 6 digits for standard ISO parser
                        clean_ts = ts_str[:26] + "Z" if len(ts_str) > 27 else ts_str
                        ts = datetime.fromisoformat(clean_ts.replace("Z", "+00:00"))
                        msg = remainder
                    except Exception:
                        pass

                # Try JSON parse
                parsed = parse_json_log_line(
                    msg,
                    default_service=container_name,
                    default_source="CONTAINER_LOG",
                )
                if parsed:
                    parsed.timestamp = ts
                    parsed.channel_or_file = container_name
                    entries.append(parsed)
                else:
                    import uuid
                    entries.append(
                        LogEntry(
                            id=f"cnt-{uuid.uuid4().hex[:8]}",
                            timestamp=ts,
                            level=LogLevelEnum.INFO,
                            service=container_name,
                            message=msg,
                            source="CONTAINER_LOG",
                            channel_or_file=container_name,
                        )
                    )

            return entries
        except (FileNotFoundError, asyncio.TimeoutError, Exception) as exc:
            logger.debug(f"Docker logs query skipped for {container_name}: {exc}")
            return []
