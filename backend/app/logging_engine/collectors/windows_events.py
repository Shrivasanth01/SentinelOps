import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from typing import List, Optional
from app.core.config import settings
from app.logging_engine.parsers.windows_event_parser import parse_windows_event_dict
from app.logging_engine.schemas.logs import LogEntry

logger = logging.getLogger("sentinelops.logging.collectors.windows")


class WindowsEventCollector:
    """
    Natively collects Windows Event Logs (System and Application channels).
    Uses PowerShell Get-WinEvent with JSON output formatting.
    Strictly forbids Security channel collection unless authorized by configuration.
    """

    ALLOWED_CHANNELS = {"System", "Application"}

    def __init__(self, authorized_security: bool = False):
        self.authorized_security = authorized_security or settings.SECURITY_EVENTS_AUTHORIZED

    async def collect_events(
        self,
        channel: str = "System",
        max_events: int = 50,
        level_filter: Optional[int] = None,
    ) -> List[LogEntry]:
        """
        Collects real Windows Events from the host OS.
        Returns empty list on non-Windows platforms or if errors occur.
        """
        if sys.platform != "win32":
            logger.debug("Windows Event collector skipped: Host OS is not Windows.")
            return []

        # Security channel restriction enforcement
        if channel.lower() == "security" and not self.authorized_security:
            logger.warning("Access Denied: Windows Security Event Log collection is not authorized.")
            raise PermissionError("Security channel collection requires explicit administrative authorization.")

        # Whitelist check
        if channel not in self.ALLOWED_CHANNELS and not channel.startswith("Microsoft-Windows-"):
            logger.warning(f"Windows Event channel '{channel}' is not in allowed list.")
            return []

        # Construct PowerShell script to fetch events as JSON
        level_clause = f"; Level={level_filter}" if level_filter else ""
        ps_command = (
            f"Get-WinEvent -FilterHashtable @{{LogName='{channel}'{level_clause}}} -MaxEvents {max_events} "
            f"-ErrorAction SilentlyContinue | Select-Object -Property Id, Level, ProviderName, LogName, "
            f"MachineName, TimeCreated, Message, RecordId | ConvertTo-Json -Depth 2 -Compress"
        )

        try:
            proc = await asyncio.create_subprocess_exec(
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                ps_command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=8.0)

            if proc.returncode != 0:
                err_msg = stderr.decode(errors="ignore").strip()
                logger.debug(f"PowerShell Get-WinEvent returned code {proc.returncode}: {err_msg}")
                return []

            raw_output = stdout.decode("utf-8", errors="ignore").strip()
            if not raw_output:
                return []

            parsed_data = json.loads(raw_output)
            events_list = parsed_data if isinstance(parsed_data, list) else [parsed_data]

            entries: List[LogEntry] = []
            for ev in events_list:
                if isinstance(ev, dict):
                    entries.append(parse_windows_event_dict(ev))

            return entries
        except asyncio.TimeoutError:
            logger.warning(f"Timeout querying Windows Event channel '{channel}'.")
            return []
        except Exception as exc:
            logger.warning(f"Failed to collect Windows Events from '{channel}': {exc}")
            return []

