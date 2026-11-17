import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.ml.config import BASE_FEATURES, DERIVED_FEATURES, FEATURE_NAMES, MLConfig
from app.ml.data.validator import DatasetValidator
from app.ml.data.preprocessing import TelemetryPreprocessor
from app.ml.features.engineering import FeatureEngineer
from app.ml.features.normalization import FeatureScaler
from app.ml.models.isolation_forest import IsolationForestModel
from app.ml.models.model_registry import ModelRegistry, model_registry
from app.ml.training.evaluator import ModelEvaluator
from app.ml.inference.scoring import classify_severity
from app.ml.inference.predictor import AnomalyPredictor
from app.ml.schemas.anomaly import PredictionEnum, AnomalySeverityEnum


def generate_synthetic_telemetry(n_samples: int = 60, seed: int = 42) -> pd.DataFrame:
    """Generate realistic nominal telemetry time-series with DatetimeIndex for deterministic testing."""
    np.random.seed(seed)
    base_time = datetime(2026, 11, 15, 12, 0, 0, tzinfo=timezone.utc)
    timestamps = [base_time + timedelta(seconds=i * 15) for i in range(n_samples)]

    # Nominal distributions
    cpu = np.clip(np.random.normal(25.0, 5.0, n_samples), 5.0, 60.0)
    memory = np.clip(np.random.normal(55.0, 3.0, n_samples), 40.0, 75.0)
    disk = np.full(n_samples, 45.2)  # Low/zero variance feature
    net_rx = np.clip(np.random.normal(150000.0, 20000.0, n_samples), 1000.0, 500000.0)
    net_tx = np.clip(np.random.normal(80000.0, 15000.0, n_samples), 1000.0, 300000.0)

    df = pd.DataFrame(
        {
            "cpu_usage_percent": cpu,
            "memory_usage_percent": memory,
            "disk_usage_percent": disk,
            "network_receive_bytes_per_second": net_rx,
            "network_transmit_bytes_per_second": net_tx,
        },
        index=pd.to_datetime(timestamps),
    )
    return df


# ---------------------------------------------------------------------------
# 1. Dataset Validator Tests
# ---------------------------------------------------------------------------

def test_dataset_validator_nominal():
    df = generate_synthetic_telemetry(60)
    validator = DatasetValidator(min_samples=30)
    is_valid, errors = validator.validate(df)
    assert is_valid is True
    assert len(errors) == 0


def test_dataset_validator_insufficient_samples():
    df = generate_synthetic_telemetry(15)
    validator = DatasetValidator(min_samples=30)
    is_valid, errors = validator.validate(df)
    assert is_valid is False
    assert any("Insufficient observations" in err for err in errors)


def test_dataset_validator_missing_columns():
    df = generate_synthetic_telemetry(60).drop(columns=["cpu_usage_percent"])
    validator = DatasetValidator()
    is_valid, errors = validator.validate(df)
    assert is_valid is False
    assert any("Missing required base feature columns" in err for err in errors)


def test_dataset_validator_unphysical_bounds():
    df = generate_synthetic_telemetry(60)
    df.iloc[0, df.columns.get_loc("cpu_usage_percent")] = 145.0  # CPU > 100%
    df.iloc[1, df.columns.get_loc("network_receive_bytes_per_second")] = -500.0  # Negative network

    validator = DatasetValidator()
    is_valid, errors = validator.validate(df)
    assert is_valid is False
    assert any("exceeding 100%" in err for err in errors)
    assert any("negative rates" in err for err in errors)


# ---------------------------------------------------------------------------
# 2. Telemetry Preprocessor Tests
# ---------------------------------------------------------------------------

def test_telemetry_preprocessor_interpolation():
    df = generate_synthetic_telemetry(60)
    # Inject a couple NaNs in the middle
    df.iloc[10, df.columns.get_loc("cpu_usage_percent")] = np.nan
    df.iloc[11, df.columns.get_loc("cpu_usage_percent")] = np.nan

    cleaned, notes = TelemetryPreprocessor.preprocess_dataset(df, interpolation_limit=3)

    assert not cleaned.isna().any().any()
    assert len(cleaned) == 60
    # Linearly interpolated value should be bounded between 5.0 and 60.0
    assert 5.0 <= cleaned.iloc[10]["cpu_usage_percent"] <= 60.0


def test_telemetry_preprocessor_empty():
    cleaned, notes = TelemetryPreprocessor.preprocess_dataset(pd.DataFrame())
    assert cleaned.empty
    assert len(notes) > 0


# ---------------------------------------------------------------------------
# 3. Feature Engineering Tests
# ---------------------------------------------------------------------------

def test_feature_engineering_derived_metrics():
    df = generate_synthetic_telemetry(60)
    engineer = FeatureEngineer(include_derived=True)
    features_df, feature_names = engineer.extract_features_df(df)

    # Derived rolling columns
    for feat in ["cpu_rolling_avg", "memory_rolling_avg", "cpu_change_rate", "memory_change_rate", "network_volatility"]:
        assert feat in features_df.columns
        assert feat in feature_names

    assert not features_df.isna().any().any()
    assert len(features_df) == 60


def test_feature_engineering_extract_vector():
    engineer = FeatureEngineer()
    obs = {
        "cpu_usage_percent": 35.0,
        "memory_usage_percent": 60.0,
        "disk_usage_percent": 50.0,
        "network_receive_bytes_per_second": 100000.0,
        "network_transmit_bytes_per_second": 50000.0,
    }
    vec = engineer.extract_single_vector(obs, FEATURE_NAMES)
    assert isinstance(vec, np.ndarray)
    assert len(vec) == len(FEATURE_NAMES)
    assert vec[0] == 35.0
    assert vec[1] == 60.0


# ---------------------------------------------------------------------------
# 4. Feature Normalization Tests
# ---------------------------------------------------------------------------

def test_feature_scaler_zero_variance_protection():
    df = generate_synthetic_telemetry(60)
    engineer = FeatureEngineer(include_derived=False)
    features_df, feature_names = engineer.extract_features_df(df)

    scaler = FeatureScaler()
    scaled = scaler.fit_transform(features_df.values, feature_names)

    assert scaled.shape == features_df.values.shape
    assert not np.isnan(scaled).any()
    # Disk has 0 variance, scaled column should be all 0.0 without division by zero crash
    disk_idx = feature_names.index("disk_usage_percent")
    assert np.allclose(scaled[:, disk_idx], 0.0)


# ---------------------------------------------------------------------------
# 5. Isolation Forest Model & Scoring Tests
# ---------------------------------------------------------------------------

def test_isolation_forest_train_and_predict():
    df = generate_synthetic_telemetry(100)
    engineer = FeatureEngineer(include_derived=True)
    features_df, feature_names = engineer.extract_features_df(df)

    model = IsolationForestModel(n_estimators=50, contamination=0.05, random_state=42)
    model.fit(features_df.values, feature_names)

    raw_scores, norm_scores, is_anom = model.score_samples(features_df.values)
    preds = model.predict_raw(features_df.values)

    assert len(norm_scores) == 100
    assert len(preds) == 100
    assert np.all(norm_scores >= 0.0)
    assert np.all(norm_scores <= 1.0)
    # Nominal observations should mostly be normal
    assert np.sum(preds == 1) >= 85

    # Test an extreme outlier point (e.g. CPU 99%, Memory 98%, extreme network)
    outlier_obs = {
        "cpu_usage_percent": 99.0,
        "memory_usage_percent": 98.0,
        "disk_usage_percent": 95.0,
        "network_receive_bytes_per_second": 90000000.0,
        "network_transmit_bytes_per_second": 90000000.0,
    }
    outlier_vec = engineer.extract_single_vector(outlier_obs, feature_names)
    outlier_2d = np.array([outlier_vec], dtype=np.float64)
    _, outlier_norm, outlier_is_anom = model.score_samples(outlier_2d)

    assert outlier_norm[0] >= 0.60
    assert outlier_is_anom[0] == True


# ---------------------------------------------------------------------------
# 6. Model Registry & Persistence Tests
# ---------------------------------------------------------------------------

def test_model_registry_save_load_lifecycle(tmp_path):
    registry = ModelRegistry(storage_dir=tmp_path)

    df = generate_synthetic_telemetry(60)
    engineer = FeatureEngineer(include_derived=False)
    features_df, feature_names = engineer.extract_features_df(df)

    model = IsolationForestModel(n_estimators=20, contamination=0.05, random_state=42, version="isoforest-test-v1")
    model.fit(features_df.values, feature_names)

    saved_file = registry.save_model(model)
    assert saved_file.endswith(".joblib")

    # Load back
    loaded_model = registry.load_model(saved_file)
    assert loaded_model.version == "isoforest-test-v1"
    assert loaded_model.training_sample_count == 60
    assert loaded_model.feature_names == feature_names

    # Path traversal rejection
    with pytest.raises(ValueError, match="Path traversal detected"):
        registry._resolve_safe_path("../../etc/shadow")


# ---------------------------------------------------------------------------
# 7. Model Evaluator Tests
# ---------------------------------------------------------------------------

def test_model_evaluator_unsupervised_metrics():
    df = generate_synthetic_telemetry(80)
    engineer = FeatureEngineer(include_derived=True)
    features_df, feature_names = engineer.extract_features_df(df)

    model = IsolationForestModel(n_estimators=30, contamination=0.05, random_state=42)
    model.fit(features_df.values, feature_names)

    report = ModelEvaluator.evaluate_holdout(model, features_df.values)

    assert report["evaluation_samples"] == 80
    assert "anomaly_rate" in report
    assert "score_mean" in report
    assert "score_std" in report
    assert "score_quantiles" in report
    assert report["stability_assessment"] in ("STABLE", "DEGENERATE_LOW_VARIANCE")
    assert "p50" in report["score_quantiles"]


# ---------------------------------------------------------------------------
# 8. Severity Classifier Tests
# ---------------------------------------------------------------------------

def test_severity_classifier():
    # Low score / not anomaly
    sev_none, _, _ = classify_severity(normalized_score=0.30, features={"cpu_usage_percent": 20.0}, is_anomaly=False)
    assert sev_none == AnomalySeverityEnum.NONE

    # Medium score
    sev_med, _, _ = classify_severity(normalized_score=0.68, features={"cpu_usage_percent": 50.0}, is_anomaly=True)
    assert sev_med == AnomalySeverityEnum.MEDIUM

    # High score
    sev_high, contrib_high, _ = classify_severity(normalized_score=0.76, features={"cpu_usage_percent": 76.0}, is_anomaly=True)
    assert sev_high == AnomalySeverityEnum.HIGH
    assert any("CPU" in c for c in contrib_high)

    # Critical score
    sev_crit, _, _ = classify_severity(normalized_score=0.88, features={"cpu_usage_percent": 90.0}, is_anomaly=True)
    assert sev_crit == AnomalySeverityEnum.CRITICAL

    # Resource saturation escalation even with moderate score
    sev_sat, contrib_sat, _ = classify_severity(normalized_score=0.72, features={"cpu_usage_percent": 96.0}, is_anomaly=True)
    assert sev_sat == AnomalySeverityEnum.CRITICAL
    assert any("CPU" in c for c in contrib_sat)


# ---------------------------------------------------------------------------
# 9. Anomaly Predictor Tests
# ---------------------------------------------------------------------------

def test_predictor_without_model():
    predictor = AnomalyPredictor()
    model_registry.set_active_model(None)

    result = predictor.predict_observation({
        "cpu_usage_percent": 50.0,
        "memory_usage_percent": 50.0,
        "disk_usage_percent": 50.0,
        "network_receive_bytes_per_second": 1000.0,
        "network_transmit_bytes_per_second": 1000.0,
    })
    assert result.prediction == PredictionEnum.UNKNOWN
    assert result.score == 0.0
    assert result.model_version == "NONE"


def test_predictor_with_trained_model():
    df = generate_synthetic_telemetry(60)
    engineer = FeatureEngineer(include_derived=False)
    features_df, feature_names = engineer.extract_features_df(df)

    model = IsolationForestModel(n_estimators=30, contamination=0.05, random_state=42, version="iso-test-pred")
    model.fit(features_df.values, feature_names)

    model_registry.set_active_model(model)
    predictor = AnomalyPredictor()

    nominal_result = predictor.predict_observation({
        "cpu_usage_percent": 25.0,
        "memory_usage_percent": 55.0,
        "disk_usage_percent": 45.2,
        "network_receive_bytes_per_second": 150000.0,
        "network_transmit_bytes_per_second": 80000.0,
    })
    assert nominal_result.prediction in (PredictionEnum.NORMAL, PredictionEnum.ANOMALOUS)
    assert nominal_result.model_version == "iso-test-pred"
    assert 0.0 <= nominal_result.score <= 1.0


# ---------------------------------------------------------------------------
# 10. REST API Endpoints Tests (with In-Memory SQLite Fixtures)
# ---------------------------------------------------------------------------

@pytest.fixture
async def phase5_db_session():
    """In-memory SQLite session for Phase 5 tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def phase5_client(phase5_db_session):
    """AsyncClient overriding get_db to in-memory SQLite and mocking Prometheus health."""
    async def _override_get_db():
        yield phase5_db_session

    app.dependency_overrides[get_db] = _override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_ml_status_endpoint(phase5_client: AsyncClient):
    with patch("app.monitoring.prometheus_client.PrometheusClient.check_health", new_callable=AsyncMock) as mock_health:
        mock_health.return_value = True
        response = await phase5_client.get("/api/v1/ml/status")
        assert response.status_code == 200
        data = response.json()
        assert "engine_status" in data
        assert "total_registered_models" in data
        assert "prometheus_connected" in data


@pytest.mark.asyncio
async def test_ml_features_endpoint(phase5_client: AsyncClient):
    response = await phase5_client.get("/api/v1/ml/features")
    assert response.status_code == 200
    data = response.json()
    assert "base_features" in data
    assert "derived_features" in data
    assert "total_features" in data
    assert len(data["base_features"]) == 5
    assert len(data["derived_features"]) == 6


@pytest.mark.asyncio
async def test_ml_models_list_endpoint(phase5_client: AsyncClient):
    response = await phase5_client.get("/api/v1/ml/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_ml_detect_endpoint(phase5_client: AsyncClient):
    # Setup active model
    df = generate_synthetic_telemetry(60)
    engineer = FeatureEngineer(include_derived=False)
    features_df, feature_names = engineer.extract_features_df(df)
    model = IsolationForestModel(n_estimators=20, contamination=0.05, random_state=42, version="iso-test-detect")
    model.fit(features_df.values, feature_names)
    model_registry.set_active_model(model)

    payload = {
        "host_id": "windows-local",
        "persist": True,
        "features": {
            "cpu_usage_percent": 30.0,
            "memory_usage_percent": 45.0,
            "disk_usage_percent": 50.0,
            "network_receive_bytes_per_second": 120000.0,
            "network_transmit_bytes_per_second": 60000.0,
        }
    }
    response = await phase5_client.post("/api/v1/ml/detect", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "score" in data
    assert "severity" in data
    assert data["model_version"] == "iso-test-detect"


@pytest.mark.asyncio
async def test_ml_anomalies_summary_and_timeline_endpoints(phase5_client: AsyncClient):
    # Summary
    sum_resp = await phase5_client.get("/api/v1/ml/anomalies/summary?hours=24")
    assert sum_resp.status_code == 200
    summary = sum_resp.json()
    assert "total_detections" in summary
    assert "normal_count" in summary
    assert "anomalous_count" in summary
    assert "severity_breakdown" in summary

    # Timeline
    tl_resp = await phase5_client.get("/api/v1/ml/anomalies/timeline?hours=24")
    assert tl_resp.status_code == 200
    tl = tl_resp.json()
    assert "buckets" in tl
    assert "total_events" in tl
