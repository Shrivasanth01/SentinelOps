import logging
from typing import Optional, List
import numpy as np
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger("sentinelops.ml.features.normalization")


class FeatureScaler:
    """
    StandardScaler wrapper with explicit zero-variance guard to prevent
    division-by-zero artifacts on steady infrastructure metrics.
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.feature_names: List[str] = []

    def fit(self, X: np.ndarray, feature_names: Optional[List[str]] = None) -> "FeatureScaler":
        self.scaler.fit(X)
        # Protect against zero variance (e.g. constant metric)
        if self.scaler.scale_ is not None:
            self.scaler.scale_ = np.where(self.scaler.scale_ == 0.0, 1.0, self.scaler.scale_)
        self.is_fitted = True
        if feature_names:
            self.feature_names = list(feature_names)
        return self

    def transform(self, X: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("FeatureScaler must be fitted before calling transform.")
        return self.scaler.transform(X)

    def fit_transform(self, X: np.ndarray, feature_names: Optional[List[str]] = None) -> np.ndarray:
        self.fit(X, feature_names)
        return self.transform(X)

    def get_means(self) -> Optional[np.ndarray]:
        return self.scaler.mean_ if self.is_fitted else None

    def get_scales(self) -> Optional[np.ndarray]:
        return self.scaler.scale_ if self.is_fitted else None
