import logging
from typing import Tuple, List
import pandas as pd
import numpy as np
from app.ml.config import FEATURE_NAMES

logger = logging.getLogger("sentinelops.ml.data.preprocessing")


class TelemetryPreprocessor:
    """
    Cleans, aligns, and prepares raw multi-metric timeseries DataFrame for
    feature engineering. Explicitly prohibits treating missing data as 0.0.
    """

    @staticmethod
    def preprocess_dataset(
        df: pd.DataFrame,
        interpolation_limit: int = 3,
    ) -> Tuple[pd.DataFrame, List[str]]:
        """
        Cleans raw Prometheus dataframe:
        1. Ensures monotonic DatetimeIndex.
        2. Interpolates small transient gaps (linear, max gap 3).
        3. Forward-fills small trailing boundary edges (max gap 2).
        4. Drops observations that still contain NaNs after bounded imputation.
        5. Logs any dropped rows.
        """
        notes: List[str] = []
        if df is None or df.empty:
            return pd.DataFrame(), ["Empty dataframe provided to preprocessor."]

        cleaned = df.copy()

        # Ensure index is sorted DatetimeIndex
        cleaned.sort_index(inplace=True)

        initial_rows = len(cleaned)

        # 1. Bounded linear interpolation for transient scrape skips
        # DO NOT fill with zero! Linear interpolation across time index preserves trajectory.
        cleaned = cleaned.interpolate(method="time", limit=interpolation_limit)

        # 2. Bounded forward-fill for final scrape alignment
        cleaned = cleaned.ffill(limit=2)

        # 3. Drop rows with residual NaNs in required base features
        base_cols_present = [c for c in FEATURE_NAMES if c in cleaned.columns]
        cleaned = cleaned.dropna(subset=base_cols_present)

        final_rows = len(cleaned)
        dropped = initial_rows - final_rows

        if dropped > 0:
            notes.append(f"Dropped {dropped} observations containing unbounded missing data ({dropped / initial_rows:.1%}).")
        else:
            notes.append("Dataset cleanly aligned with zero unbounded missing data.")

        return cleaned, notes
