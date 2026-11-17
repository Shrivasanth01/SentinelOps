import logging
from typing import Dict, List, Tuple
import numpy as np
from app.ml.config import MLConfig
from app.ml.schemas.anomaly import AnomalySeverityEnum, PredictionEnum

logger = logging.getLogger("sentinelops.ml.inference.scoring")


def classify_severity(
    normalized_score: float,
    features: Dict[str, float],
    is_anomaly: bool,
) -> Tuple[AnomalySeverityEnum, List[str], str]:
    """
    Classifies anomaly severity by combining the statistical isolation score
    with domain-specific infrastructure stress indicators.

    Returns (severity, contributing_metrics, explanation).
    """
    contributing: List[str] = []

    cpu = features.get("cpu_usage_percent", 0.0)
    mem = features.get("memory_usage_percent", 0.0)
    disk = features.get("disk_usage_percent", 0.0)
    rx = features.get("network_receive_bytes_per_second", 0.0)
    tx = features.get("network_transmit_bytes_per_second", 0.0)

    # Detect individual metric contributions
    if cpu >= 85.0:
        contributing.append(f"CPU Utilization ({cpu:.1f}%)")
    elif cpu >= 75.0:
        contributing.append(f"Elevated CPU ({cpu:.1f}%)")

    if mem >= 90.0:
        contributing.append(f"Memory Saturation ({mem:.1f}%)")
    elif mem >= 80.0:
        contributing.append(f"Elevated Memory ({mem:.1f}%)")

    if disk >= 90.0:
        contributing.append(f"Disk Exhaustion ({disk:.1f}%)")

    if rx >= 50 * 1024 * 1024:  # > 50 MB/s
        contributing.append(f"Inbound Network Burst ({rx / (1024*1024):.1f} MB/s)")
    if tx >= 50 * 1024 * 1024:
        contributing.append(f"Outbound Network Burst ({tx / (1024*1024):.1f} MB/s)")

    # Derived volatility contributions
    net_vol = features.get("network_volatility", 0.0)
    if net_vol > 10 * 1024 * 1024:
        contributing.append(f"Network Volatility ({net_vol / (1024*1024):.1f} MB/s)")

    util_vol = features.get("utilization_volatility", 0.0)
    if util_vol > 20.0:
        contributing.append(f"Resource Volatility Index ({util_vol:.1f})")

    if not is_anomaly:
        return AnomalySeverityEnum.NONE, contributing, "Telemetry is within statistically normal operating parameters."

    # Multi-factor Severity Assessment
    if normalized_score >= MLConfig.CRITICAL_SCORE_THRESHOLD or (cpu >= 90.0 or mem >= 95.0 or disk >= 95.0):
        severity = AnomalySeverityEnum.CRITICAL
        summary = "Critical multi-dimensional anomaly: severe resource saturation or extreme statistical outlier."
    elif normalized_score >= 0.75 or (cpu >= 80.0 or mem >= 85.0):
        severity = AnomalySeverityEnum.HIGH
        summary = "High-severity anomaly: notable metric deviation from historical cluster."
    elif normalized_score >= 0.60:
        severity = AnomalySeverityEnum.MEDIUM
        summary = "Moderate behavioral divergence from nominal cluster."
    else:
        severity = AnomalySeverityEnum.LOW
        summary = "Low-level deviation detected near decision boundary."

    if contributing:
        explanation = f"{summary} Key drivers: {', '.join(contributing)}."
    else:
        explanation = f"{summary} Driven by joint multi-variate feature space distance."

    return severity, contributing, explanation
