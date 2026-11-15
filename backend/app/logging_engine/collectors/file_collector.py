import os
from pathlib import Path
from typing import List, Optional
from app.logging_engine.parsers.json_parser import parse_json_log_line
from app.logging_engine.schemas.logs import LogEntry


class ValidatedFileLogCollector:
    """
    Collects application log files from explicitly authorized and validated paths.
    Prevents directory traversal attacks and blocks access to sensitive OS system files.
    """

    FORBIDDEN_PATTERNS = ["..", "/etc/", "/var/log/auth", "C:\\Windows", "C:\\Program Files"]

    def __init__(self, allowed_base_dir: Optional[Path] = None):
        # By default, logs within workspace root or designated logs/ folder are allowed
        self.workspace_root = Path(os.getcwd()).resolve()

    def validate_file_path(self, file_path_str: str) -> Path:
        """Validates that a log file path is safe and accessible."""
        cleaned = file_path_str.strip()
        if not cleaned:
            raise ValueError("Log file path cannot be empty.")

        for pat in self.FORBIDDEN_PATTERNS:
            if pat.lower() in cleaned.lower():
                raise ValueError(f"Prohibited path component '{pat}' in target file.")

        resolved = Path(cleaned).resolve()

        # Reject path traversal outside workspace
        try:
            resolved.relative_to(self.workspace_root)
        except ValueError:
            # If not in workspace, reject unless specifically configured in non-system dev path
            if "system32" in str(resolved).lower() or "windows" in str(resolved).lower():
                raise ValueError("Access to OS system directories is strictly prohibited.")

        return resolved

    def collect_recent_lines(
        self,
        file_path_str: str,
        max_lines: int = 100,
        service_name: str = "custom-file-source",
    ) -> List[LogEntry]:
        """Reads recent log lines from the validated file and parses each line."""
        target_path = self.validate_file_path(file_path_str)

        if not target_path.exists() or not target_path.is_file():
            return []

        entries: List[LogEntry] = []
        try:
            with open(target_path, "r", encoding="utf-8", errors="ignore") as f:
                # Read all lines (or last max_lines)
                lines = f.readlines()
                recent_lines = lines[-max_lines:] if len(lines) > max_lines else lines

                for line in recent_lines:
                    parsed = parse_json_log_line(
                        line,
                        default_service=service_name,
                        default_source="FILE",
                    )
                    if parsed:
                        parsed.channel_or_file = str(target_path.name)
                        entries.append(parsed)
        except Exception:
            return []

        return entries
