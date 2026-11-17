import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.config import BASE_FEATURES, DERIVED_FEATURES, MLConfig
from app.ml.models.isolation_forest import IsolationForestModel
from app.ml.models.model_registry import model_registry
from app.ml.schemas.model import (
    FeatureItem,
    FeatureSchemaResponse,
    MLStatusResponse,
    ModelEvaluationResponse,
    ModelListResponse,
    ModelMetadata,
    ModelStatusEnum,
    ModelTrainRequest,
    ModelTrainResponse,
)
from app.ml.training.evaluator import ModelEvaluator
from app.ml.training.trainer import ModelTrainer
from app.models.ml import MLModelRecord
from app.monitoring.prometheus_client import PrometheusClient

logger = logging.getLogger("sentinelops.ml.services.model")


class ModelService:
    """
    Manages database lifecycle, version tracking, background training,
    holdout evaluation, zero-downtime activation, and rollback for ML models.
    """

    def __init__(self, prom_client: Optional[PrometheusClient] = None):
        self.prom_client = prom_client or PrometheusClient()
        self.trainer = ModelTrainer(self.prom_client)
        self.evaluator = ModelEvaluator()

    async def initialize_from_db(self, session: AsyncSession) -> None:
        """
        Loads the currently marked active model from PostgreSQL/SQLite into memory.
        Safe against startup when no models have yet been trained.
        """
        try:
            stmt = select(MLModelRecord).where(MLModelRecord.is_active == True).limit(1)
            result = await session.execute(stmt)
            record = result.scalars().first()
            if record:
                try:
                    loaded_model = model_registry.load_model(record.file_path)
                    model_registry.set_active_model(loaded_model)
                    logger.info(f"Loaded active model version {record.version} from {record.file_path}")
                except Exception as exc:
                    logger.warning(f"Could not load active model artifact {record.file_path}: {exc}")
        except Exception as exc:
            logger.debug(f"DB not initialized or offline during model init: {exc}")

    async def list_models(self, session: AsyncSession) -> ModelListResponse:
        """Retrieves all registered model records ordered by creation date."""
        try:
            stmt = select(MLModelRecord).order_by(MLModelRecord.created_at.desc())
            result = await session.execute(stmt)
            records = result.scalars().all()
        except Exception as exc:
            logger.warning(f"Failed to query model records: {exc}")
            records = []

        models: List[ModelMetadata] = []
        active_meta: Optional[ModelMetadata] = None

        for r in records:
            features = json.loads(r.features_json) if r.features_json else []
            eval_metrics = json.loads(r.evaluation_metrics_json) if r.evaluation_metrics_json else None
            meta = ModelMetadata(
                id=r.id,
                version=r.version,
                model_type=r.model_type,
                file_path=r.file_path,
                n_estimators=r.n_estimators,
                contamination=r.contamination,
                random_state=r.random_state,
                features=features,
                training_sample_count=r.training_sample_count,
                training_time_range_start=r.training_time_range_start,
                training_time_range_end=r.training_time_range_end,
                training_duration_seconds=r.training_duration_seconds,
                evaluation_metrics=eval_metrics,
                is_active=r.is_active,
                status=ModelStatusEnum(r.status),
                created_at=r.created_at,
            )
            models.append(meta)
            if r.is_active:
                active_meta = meta

        return ModelListResponse(models=models, total=len(models), active_model=active_meta)

    async def get_model(self, session: AsyncSession, model_id: str) -> Optional[ModelMetadata]:
        """Retrieves single model metadata by ID."""
        try:
            stmt = select(MLModelRecord).where(MLModelRecord.id == model_id)
            result = await session.execute(stmt)
            r = result.scalars().first()
            if not r:
                return None
            features = json.loads(r.features_json) if r.features_json else []
            eval_metrics = json.loads(r.evaluation_metrics_json) if r.evaluation_metrics_json else None
            return ModelMetadata(
                id=r.id,
                version=r.version,
                model_type=r.model_type,
                file_path=r.file_path,
                n_estimators=r.n_estimators,
                contamination=r.contamination,
                random_state=r.random_state,
                features=features,
                training_sample_count=r.training_sample_count,
                training_time_range_start=r.training_time_range_start,
                training_time_range_end=r.training_time_range_end,
                training_duration_seconds=r.training_duration_seconds,
                evaluation_metrics=eval_metrics,
                is_active=r.is_active,
                status=ModelStatusEnum(r.status),
                created_at=r.created_at,
            )
        except Exception as exc:
            logger.error(f"Error fetching model {model_id}: {exc}")
            return None

    async def train_model(
        self,
        session: AsyncSession,
        req: ModelTrainRequest,
    ) -> ModelTrainResponse:
        """
        Executes end-to-end model training, holdout evaluation, persistence,
        and database registration. Hot-swaps model into active inference if requested.
        """
        model, train_meta, eval_report = await self.trainer.train_model(
            time_range=req.time_range,
            contamination=req.contamination,
            n_estimators=req.n_estimators,
        )

        should_activate = req.activate_if_valid and eval_report.get("is_valid", True)
        status_val = "ACTIVE" if should_activate else ("VALIDATED" if eval_report.get("is_valid") else "CANDIDATE")

        try:
            if should_activate:
                # Deactivate current active models
                await session.execute(
                    update(MLModelRecord).where(MLModelRecord.is_active == True).values(is_active=False)
                )

            record = MLModelRecord(
                version=model.version,
                model_type="IsolationForest",
                file_path=train_meta["file_path"],
                n_estimators=train_meta["n_estimators"],
                contamination=train_meta["contamination"],
                random_state=train_meta["random_state"],
                features_json=json.dumps(train_meta["features"]),
                training_sample_count=train_meta["training_sample_count"],
                training_time_range_start=train_meta["training_time_range_start"],
                training_time_range_end=train_meta["training_time_range_end"],
                training_duration_seconds=train_meta["training_duration_seconds"],
                evaluation_metrics_json=json.dumps(eval_report),
                is_active=should_activate,
                status=status_val,
                created_at=train_meta["trained_at"],
            )
            session.add(record)
            await session.commit()
            await session.refresh(record)
            model_id = record.id

            if should_activate:
                model_registry.set_active_model(model)

            msg = (
                f"Model {model.version} trained and activated successfully."
                if should_activate
                else f"Model {model.version} trained as candidate artifact."
            )

            return ModelTrainResponse(
                success=True,
                model_id=model_id,
                version=model.version,
                sample_count=train_meta["training_sample_count"],
                duration_seconds=train_meta["training_duration_seconds"],
                contamination=train_meta["contamination"],
                n_estimators=train_meta["n_estimators"],
                is_active=should_activate,
                evaluation=eval_report,
                message=msg,
            )
        except Exception as exc:
            await session.rollback()
            logger.error(f"Failed to commit model record to database: {exc}")
            # If DB failed but model was saved, set in registry anyway
            if should_activate:
                model_registry.set_active_model(model)
            return ModelTrainResponse(
                success=True,
                model_id="local-artifact",
                version=model.version,
                sample_count=train_meta["training_sample_count"],
                duration_seconds=train_meta["training_duration_seconds"],
                contamination=train_meta["contamination"],
                n_estimators=train_meta["n_estimators"],
                is_active=should_activate,
                evaluation=eval_report,
                message=f"Model artifact saved to disk. Database record sync warning: {exc}",
            )

    async def activate_model(
        self,
        session: AsyncSession,
        model_id: str,
    ) -> Optional[ModelMetadata]:
        """
        Activates a specific model version and hot-swaps it into memory.
        Supports seamless rollback to any previous version.
        """
        try:
            stmt = select(MLModelRecord).where(MLModelRecord.id == model_id)
            result = await session.execute(stmt)
            target = result.scalars().first()
            if not target:
                return None

            # Load model artifact from disk
            model = model_registry.load_model(target.file_path)
            model_registry.set_active_model(model)

            # Deactivate all others
            await session.execute(
                update(MLModelRecord).where(MLModelRecord.is_active == True).values(is_active=False)
            )

            # Activate target
            target.is_active = True
            target.status = "ACTIVE"
            await session.commit()
            await session.refresh(target)

            return await self.get_model(session, model_id)
        except Exception as exc:
            await session.rollback()
            logger.error(f"Failed to activate model {model_id}: {exc}")
            raise

    async def evaluate_model(
        self,
        session: AsyncSession,
        model_id: str,
    ) -> Optional[ModelEvaluationResponse]:
        """Runs evaluation report on holdout data for a specific registered model."""
        target = await self.get_model(session, model_id)
        if not target:
            return None

        # Load artifact
        model = model_registry.load_model(target.file_path)

        # Collect fresh 1h holdout dataset
        df, _ = await self.trainer.collector.collect_historical_dataset(time_range="1h")
        clean_df, _ = self.trainer.preprocessor.preprocess_dataset(df)
        feat_df, _ = self.trainer.engineer.extract_features_df(clean_df)

        if len(feat_df) < 5:
            # Fallback to recorded evaluation if fresh holdout is too small
            eval_metrics = target.evaluation_metrics or {}
            return ModelEvaluationResponse(
                model_id=target.id,
                version=target.version,
                evaluation_samples=eval_metrics.get("evaluation_samples", target.training_sample_count),
                anomaly_rate=eval_metrics.get("anomaly_rate", target.contamination),
                score_quantiles=eval_metrics.get("score_quantiles", {}),
                score_mean=eval_metrics.get("score_mean", 0.5),
                score_std=eval_metrics.get("score_std", 0.1),
                stability_assessment=eval_metrics.get("stability_assessment", "HISTORICAL_BASELINE"),
            )

        report = self.evaluator.evaluate_holdout(model, feat_df.values)

        return ModelEvaluationResponse(
            model_id=target.id,
            version=target.version,
            evaluation_samples=report.get("evaluation_samples", len(feat_df)),
            anomaly_rate=report.get("anomaly_rate", 0.0),
            score_quantiles=report.get("score_quantiles", {}),
            score_mean=report.get("score_mean", 0.0),
            score_std=report.get("score_std", 0.0),
            stability_assessment=report.get("stability_assessment", "STABLE"),
        )

    async def get_status(self, session: AsyncSession) -> MLStatusResponse:
        """Retrieves global machine learning subsystem status."""
        active_model = model_registry.get_active_model()
        prom_healthy = await self.prom_client.check_health()

        total_models = 0
        last_train_time = None
        try:
            count_stmt = select(func.count(MLModelRecord.id))
            res = await session.execute(count_stmt)
            total_models = res.scalar() or 0

            latest_stmt = select(MLModelRecord.created_at).order_by(MLModelRecord.created_at.desc()).limit(1)
            latest_res = await session.execute(latest_stmt)
            last_train_time = latest_res.scalar()
        except Exception:
            total_models = len(model_registry.list_saved_artifacts())

        # Total anomalies
        from app.models.anomalies import AnomalyEventRecord
        total_anomalies = 0
        try:
            anom_stmt = select(func.count(AnomalyEventRecord.id))
            anom_res = await session.execute(anom_stmt)
            total_anomalies = anom_res.scalar() or 0
        except Exception:
            pass

        active_version = active_model.version if active_model else None
        engine_status = "ONLINE" if active_model else "UNINITIALIZED"

        from app.ml.config import ALL_FEATURE_NAMES
        return MLStatusResponse(
            engine_status=engine_status,
            active_model_version=active_version,
            active_model_id=active_version,
            total_registered_models=total_models,
            prometheus_connected=prom_healthy,
            last_training_time=last_train_time,
            total_anomalies_recorded=total_anomalies,
            features_active=active_model.feature_names if active_model else ALL_FEATURE_NAMES,
        )

    @staticmethod
    def get_features_schema() -> FeatureSchemaResponse:
        """Returns metadata documentation for base and derived features."""
        base_items = [
            FeatureItem(
                name=f["name"],
                description=f["description"],
                unit=f["unit"],
                metric_type=f.get("metric_type"),
                is_derived=False,
            )
            for f in BASE_FEATURES
        ]
        derived_items = [
            FeatureItem(
                name=f["name"],
                description=f["description"],
                unit=f["unit"],
                metric_type="derived",
                is_derived=True,
            )
            for f in DERIVED_FEATURES
        ]
        return FeatureSchemaResponse(
            base_features=base_items,
            derived_features=derived_items,
            total_features=len(base_items) + len(derived_items),
        )


model_service = ModelService()
