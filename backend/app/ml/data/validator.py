import logging
from typing import Dict, List, Tuple, Any
import numpy as np
import pandas as pd
from app.ml.config import FEATURE_NAMES, MLConfig

logger = logging.getLogger("sentinelops.ml.data.validator")


class DataValidationError(Exception):
    """Raised when telemetry dataset fails validation requirements."""
    pass


class DatasetValidator:
    """
    Validates collected historical infrastructure telemetry for machine learning.
    Rejects invalid, empty, severely incomplete, or unphysical observations.
    """

    def __init__(self, min_samples: int = MLConfig.MIN_TRAINING_SAMPLES):
        self.min_samples = min_samples

    def validate(self, df: pd.DataFrame) -> Tuple[bool, List[str]]:
        """
        Runs comprehensive validation checks.
        Returns (is_valid, list_of_reasons).
        """
        issues: List[str] = []

        if df is None or df.empty:
            issues.append("Dataset is empty. No telemetry observations were retrieved.")
            return False, issues

        # 1. Observation count check
        row_count = len(df)
        if row_count < self.min_samples:
            issues.append(
                f"Insufficient observations: retrieved {row_count} rows, minimum required is {self.min_samples}."
            )

        # 2. Required feature columns check
        missing_cols = [f for f in FEATURE_NAMES if f not in df.columns]
        if missing_cols:
            issues.append(f"Missing required base feature columns: {missing_cols}")

        # 3. Missing value fraction check
        for col in FEATURE_NAMES:
            if col in df.columns:
                null_ratio = df[col].isnull().mean()
                if null_ratio > 0.30:
                    issues.append(
                        f"Column '{col}' has excessive missing values ({null_ratio:.1%}, max allowed 30%)."
                    )

        # 4. Unphysical value checks (percentage bounds)
        percentage_cols = ["cpu_usage_percent", "memory_usage_percent", "disk_usage_percent"]
        for col in percentage_cols:
            if col in df.columns:
                valid_vals = df[col].dropna()
                if not valid_vals.empty:
                    if (valid_vals < -0.1).any():
                        issues.append(f"Column '{col}' contains negative values below 0%.")
                    if (valid_vals > 105.0).any():
                        issues.append(f"Column '{col}' contains unphysical values exceeding 100%.")

        # 5. Non-negative throughput checks
        rate_cols = ["network_receive_bytes_per_second", "network_transmit_bytes_per_second"]
        for col in rate_cols:
            if col in df.columns:
                valid_vals = df[col].dropna()
                if not valid_vals.empty and (valid_vals < -0.1).any():
                    issues.append(f"Throughput metric '{col}' contains negative rates.")

        is_valid = len(issues) == 0
        return is_valid, issues

    def check_variance(self, df: pd.DataFrame) -> Dict[str, float]:
        """Calculates variance per feature to detect constant sensors."""
        variances = {}
        for col in df.columns:
            if np.issubdtype(df[col].dtype, np.number):
                variances[col] = float(df[col].var())
        return variances
