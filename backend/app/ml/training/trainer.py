import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from app.ml.config import MLConfig
from app.ml.data.collector import TelemetryDataCollector
from app.ml.data.validator import DatasetValidator, DataValidationError
from app.ml.data.preprocessing import TelemetryPreprocessor
from app.ml.features.engineering import FeatureEngineer
from app.ml.models.isolation_forest import IsolationForestModel
from app.ml.models.model_registry import model_registry
from app.ml.training.evaluator import ModelEvaluator
from app.monitoring.prometheus_client import PrometheusClient

logger = logging.getLogger("sentinelops.ml.training.trainer")


class ModelTrainer:
    """
    End-to-end training pipeline:
    Prometheus telemetry ingestion -> dataset validation -> feature engineering ->
    chronological train/holdout split -> Isolation Forest fitting -> unsupervised evaluation ->
    artifact persistence.
    """

    def __init__(self, client: Optional[PrometheusClient] = None):
        self.collector = TelemetryDataCollector(client)
        self.validator = DatasetValidator(min_samples=MLConfig.MIN_TRAINING_SAMPLES)
        self.preprocessor = TelemetryPreprocessor()
        self.engineer = FeatureEngineer(include_derived=True)
        self.evaluator = ModelEvaluator()

    async def train_model(
        self,
        time_range: str = "1h",
        contamination: Optional[float] = None,
        n_estimators: Optional[int] = None,
        random_state: Optional[int] = None,
    ) -> Tuple[IsolationForestModel, Dict[str, Any], Dict[str, Any]]:
        """
        Executes complete training pipeline.
        Returns (model, training_metadata, evaluation_report).
        """
        start_wall_time = time.perf_counter()
        train_start_ts = datetime.now(timezone.utc)

        actual_contamination = contamination or MLConfig.DEFAULT_CONTAMINATION
        actual_n_estimators = n_estimators or MLConfig.DEFAULT_N_ESTIMATORS
        actual_random_state = random_state or MLConfig.DEFAULT_RANDOM_STATE

        # 1. Collect telemetry from Prometheus
        raw_df, col_meta = await self.collector.collect_historical_dataset(time_range=time_range)

        # 2. Validate raw dataset
        is_valid, issues = self.validator.validate(raw_df)
        if not is_valid:
            logger.error(f"Training dataset validation failed: {issues}")
            raise DataValidationError(f"Telemetry validation failed: {'; '.join(issues)}")

        # 3. Preprocess and handle missing values
        clean_df, prep_notes = self.preprocessor.preprocess_dataset(raw_df)
        if len(clean_df) < MLConfig.MIN_TRAINING_SAMPLES:
            raise DataValidationError(
                f"Insufficient valid telemetry after cleaning ({len(clean_df)} rows, minimum {MLConfig.MIN_TRAINING_SAMPLES})."
            )

        # 4. Feature Engineering
        feat_df, feature_names = self.engineer.extract_features_df(clean_df)

        # 5. Chronological holdout split (80% train, 20% holdout validation)
        split_idx = int(len(feat_df) * 0.8)
        # Ensure at least 5 holdout samples
        if len(feat_df) - split_idx < 5:
            split_idx = len(feat_df) - 5

        train_data = feat_df.iloc[:split_idx].values
        holdout_data = feat_df.iloc[split_idx:].values

        # 6. Fit Isolation Forest model
        version_str = f"isoforest-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        model = IsolationForestModel(
            n_estimators=actual_n_estimators,
            contamination=actual_contamination,
            random_state=actual_random_state,
            version=version_str,
        )
        model.fit(train_data, feature_names)

        # 7. Evaluate on chronological holdout
        eval_report = self.evaluator.evaluate_holdout(model, holdout_data)

        # 8. Persist artifact to safe model directory
        saved_filename = model_registry.save_model(model)

        duration = round(time.perf_counter() - start_wall_time, 3)

        training_metadata = {
            "version": version_str,
            "file_path": saved_filename,
            "n_estimators": actual_n_estimators,
            "contamination": actual_contamination,
            "random_state": actual_random_state,
            "features": feature_names,
            "training_sample_count": len(train_data),
            "holdout_sample_count": len(holdout_data),
            "total_observations": len(feat_df),
            "training_time_range_start": col_meta["start_time"],
            "training_time_range_end": col_meta["end_time"],
            "training_duration_seconds": duration,
            "preprocessing_notes": prep_notes,
            "trained_at": train_start_ts,
        }

        logger.info(
            f"Successfully trained Isolation Forest {version_str} in {duration}s on {len(train_data)} samples. "
            f"Holdout anomaly rate: {eval_report.get('anomaly_rate', 0.0):.2%}"
        )

        return model, training_metadata, eval_report
