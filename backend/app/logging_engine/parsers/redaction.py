import re
from typing import Any, Dict

# Regex patterns for sensitive data redaction
PATTERNS = [
    # Authorization / Bearer tokens
    (re.compile(r"(Bearer\s+)[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE), r"\1[REDACTED]"),
    (re.compile(r"(Basic\s+)[A-Za-z0-9+/=]+", re.IGNORECASE), r"\1[REDACTED]"),
    # Passwords in key-value / JSON / query string: password="...", "password": "...", password=...
    (
        re.compile(r'(?i)(password|passwd|pwd|secret|api_key|apikey|token|auth_token)\s*([:=]\s*)["\']?([^"\'\s&,;]{3,})["\']?'),
        r"\1\2[REDACTED]",
    ),
    # Connection strings with credentials: postgresql://user:password@host
    (
        re.compile(r"([a-zA-Z0-9+]+://[^:]+:)([^@/]+)(@)"),
        r"\1[REDACTED]\3",
    ),
    # AWS Access Keys: AKIA... (20 chars)
    (re.compile(r"\b(AKIA[0-9A-Z]{16})\b"), r"[REDACTED_AWS_KEY]"),
    # RSA / Private Keys
    (
        re.compile(r"-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----"),
        r"[REDACTED_PRIVATE_KEY]",
    ),
]


def redact_sensitive_text(text: str) -> str:
    """
    Redacts sensitive credentials, tokens, passwords, and connection strings from text payloads.

    LIMITATIONS OF PATTERN-BASED REDACTION:
    1. Heuristic pattern matching cannot guarantee detection of custom or obfuscated secrets (e.g. custom encoding).
    2. High-entropy random tokens that do not follow recognized credential prefixes or key-value names may not be matched.
    3. Truncated or multi-line formatted secrets spanning disjoint log fragments may evade single-pass regex.
    """
    if not text:
        return ""

    sanitized = text
    for regex, replacement in PATTERNS:
        sanitized = regex.sub(replacement, sanitized)

    return sanitized


def redact_metadata_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively scans and redacts sensitive keys and values in metadata dictionaries.
    """
    sensitive_keys = {
        "password",
        "passwd",
        "secret",
        "api_key",
        "apikey",
        "token",
        "authorization",
        "private_key",
        "access_token",
    }
    redacted: Dict[str, Any] = {}
    for key, value in data.items():
        if any(sk in key.lower() for sk in sensitive_keys):
            redacted[key] = "[REDACTED]"
        elif isinstance(value, str):
            redacted[key] = redact_sensitive_text(value)
        elif isinstance(value, dict):
            redacted[key] = redact_metadata_dict(value)
        elif isinstance(value, list):
            redacted[key] = [
                redact_metadata_dict(item) if isinstance(item, dict)
                else redact_sensitive_text(item) if isinstance(item, str)
                else item
                for item in value
            ]
        else:
            redacted[key] = value

    return redacted
