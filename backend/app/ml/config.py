import os
from pathlib import Path
from typing import List, Dict, Any
from app.core.config import settings

# Base feature schema specification
BASE_FEATURES: List[Dict[str, Any]] = [
    {
        "name": "cpu_usage_percent",
        "description": "Host CPU utilization percentage",
        "unit": "%",
        "metric_type": "gauge",
        "min_val": 0.0,
        "max_val": 100.0,
    },
    {
        "name": "memory_usage_percent",
        "description": "Physical RAM utilization percentage",
        "unit": "%",
        "metric_type": "gauge",
        "min_val": 0.0,
        "max_val": 100.0,
    },
    {
        "name": "disk_usage_percent",
        "description": "Primary storage volume capacity utilization",
        "unit": "%",
        "metric_type": "gauge",
        "min_val": 0.0,
        "max_val": 100.0,
    },
    {
        "name": "network_receive_bytes_per_second",
        "description": "Inbound network throughput rate",
        "unit": "B/s",
        "metric_type": "rate",
        "min_val": 0.0,
        "max_val": None,
    },
    {
        "name": "network_transmit_bytes_per_second",
        "description": "Outbound network throughput rate",
        "unit": "B/s",
        "metric_type": "rate",
        "min_val": 0.0,
        "max_val": None,
    },
]

# Dynamic rolling features (computed when >= 30 aligned samples are present)
DERIVED_FEATURES: List[Dict[str, Any]] = [
    {
        "name": "cpu_rolling_avg",
        "description": "5-sample rolling mean of CPU utilization",
        "unit": "%",
    },
    {
        "name": "memory_rolling_avg",
        "description": "5-sample rolling mean of memory utilization",
        "unit": "%",
    },
    {
        "name": "cpu_change_rate",
        "description": "Instantaneous rate of change of CPU utilization",
        "unit": "%/step",
    },
    {
        "name": "memory_change_rate",
        "description": "Instantaneous rate of change of memory utilization",
        "unit": "%/step",
    },
    {
        "name": "network_volatility",
        "description": "Sliding standard deviation of aggregate network bandwidth",
        "unit": "B/s",
    },
    {
        "name": "utilization_volatility",
        "description": "Combined volatility index across CPU and memory",
        "unit": "index",
    },
]

FEATURE_NAMES: List[str] = [f["name"] for f in BASE_FEATURES]
ALL_FEATURE_NAMES: List[str] = FEATURE_NAMES + [f["name"] for f in DERIVED_FEATURES]


class MLConfig:
    """Runtime configuration for ML Anomaly Detection Engine."""
    DEFAULT_CONTAMINATION: float = settings.ML_CONTAMINATION
    DEFAULT_N_ESTIMATORS: int = settings.ML_N_ESTIMATORS
    DEFAULT_RANDOM_STATE: int = settings.ML_RANDOM_STATE
    MIN_TRAINING_SAMPLES: int = settings.ML_MIN_TRAINING_SAMPLES
    ANOMALY_SCORE_THRESHOLD: float = settings.ML_SCORE_ANOMALY_THRESHOLD
    CRITICAL_SCORE_THRESHOLD: float = settings.ML_SCORE_CRITICAL_THRESHOLD

    # Storage paths
    MODEL_DIR: Path = Path(settings.ML_MODEL_STORAGE_PATH)

    @classmethod
    def ensure_model_dir(cls) -> Path:
        cls.MODEL_DIR.mkdir(parents=True, exist_ok=True)
        return cls.MODEL_DIR


# Ensure storage path exists at import time
MLConfig.ensure_model_dir()
