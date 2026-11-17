import logging
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import pandas as pd
from app.ml.config import BASE_FEATURES, FEATURE_NAMES, DERIVED_FEATURES, ALL_FEATURE_NAMES

logger = logging.getLogger("sentinelops.ml.features.engineering")


class FeatureEngineer:
    """
    Computes base and dynamic multi-variate infrastructure features from
    preprocessed telemetry. Ensures consistent feature orders and schema versions.
    """

    def __init__(self, include_derived: bool = True):
        self.include_derived = include_derived

    def extract_features_df(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Transforms clean telemetry dataframe into model feature matrix.
        Adds dynamic rolling statistics and volatility metrics when historical depth permits.
        """
        if df.empty:
            return pd.DataFrame(), []

        feat_df = df[FEATURE_NAMES].copy()

        features_used = list(FEATURE_NAMES)

        # Only compute derived rolling features if we have sufficient observations (>= 10)
        if self.include_derived and len(feat_df) >= 10:
            # 1. Rolling averages (window=5)
            feat_df["cpu_rolling_avg"] = feat_df["cpu_usage_percent"].rolling(window=5, min_periods=1).mean()
            feat_df["memory_rolling_avg"] = feat_df["memory_usage_percent"].rolling(window=5, min_periods=1).mean()

            # 2. Instantaneous rate of change
            feat_df["cpu_change_rate"] = feat_df["cpu_usage_percent"].diff().fillna(0.0)
            feat_df["memory_change_rate"] = feat_df["memory_usage_percent"].diff().fillna(0.0)

            # 3. Network Volatility
            total_net = feat_df["network_receive_bytes_per_second"] + feat_df["network_transmit_bytes_per_second"]
            feat_df["network_volatility"] = total_net.rolling(window=5, min_periods=1).std().fillna(0.0)

            # 4. Resource Volatility
            total_util = feat_df["cpu_usage_percent"] + feat_df["memory_usage_percent"]
            feat_df["utilization_volatility"] = total_util.rolling(window=5, min_periods=1).std().fillna(0.0)

            features_used = list(feat_df.columns)

        return feat_df, features_used

    @staticmethod
    def extract_single_vector(
        snapshot_dict: Dict[str, float],
        feature_names: List[str],
        rolling_state: Optional[Dict[str, float]] = None,
    ) -> np.ndarray:
        """
        Extracts ordered 1D numpy array for real-time inference from a telemetry dictionary.
        Uses rolling_state buffer when derived features are required.
        """
        values: List[float] = []
        for name in feature_names:
            if name in snapshot_dict:
                values.append(float(snapshot_dict[name]))
            elif rolling_state and name in rolling_state:
                values.append(float(rolling_state[name]))
            elif name == "cpu_rolling_avg":
                values.append(float(snapshot_dict.get("cpu_usage_percent", 0.0)))
            elif name == "memory_rolling_avg":
                values.append(float(snapshot_dict.get("memory_usage_percent", 0.0)))
            elif name in ("cpu_change_rate", "memory_change_rate", "network_volatility", "utilization_volatility"):
                values.append(0.0)
            else:
                values.append(0.0)

        return np.array(values, dtype=np.float64)
