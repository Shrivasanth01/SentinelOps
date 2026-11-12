import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.ml.isolation_forest import anomaly_detector
from app.services.anomaly_service import anomaly_service
from app.monitoring.collector import metrics_collector
from app.db.base import Base
from app.models.anomalies import AnomalyEventRecord


@pytest.mark.asyncio
async def test_isolation_forest_scoring():
    snapshot = metrics_collector.snapshot()
    score, is_anomaly, contributing, severity = anomaly_detector.score_snapshot(snapshot)

    assert 0.0 <= score <= 1.0
    assert isinstance(is_anomaly, bool)
    assert isinstance(contributing, list)
    assert severity.value in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


@pytest.mark.asyncio
async def test_anomaly_score_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/anomalies/score")
    assert response.status_code == 200
    data = response.json()

    assert "score" in data
    assert 0.0 <= data["score"] <= 1.0
    assert "is_anomaly" in data
    assert "severity" in data
    assert "status" in data
    assert "contributing_metrics" in data


@pytest.mark.asyncio
async def test_recent_anomalies_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/anomalies/recent?limit=5")
    assert response.status_code == 200
    data = response.json()

    assert "anomalies" in data
    assert "total_count" in data
    assert len(data["anomalies"]) >= 1


@pytest.mark.asyncio
async def test_retrain_endpoint(client: AsyncClient):
    response = await client.post("/api/v1/anomalies/retrain")
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["sample_count"] > 0
    assert "message" in data


@pytest.mark.asyncio
async def test_simulate_anomaly_endpoint(client: AsyncClient):
    response = await client.post("/api/v1/anomalies/simulate?severity=CRITICAL&metric=Memory%20Percent")
    assert response.status_code == 200
    data = response.json()

    assert data["is_anomaly"] is True
    assert data["severity"] == "CRITICAL"
    assert "Memory Percent" in data["contributing_metrics"]


@pytest.mark.asyncio
async def test_anomaly_event_record_persistence():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        record = AnomalyEventRecord(
            score=0.88,
            is_anomaly=True,
            severity="CRITICAL",
            contributing_metrics='["Cpu Percent", "Network Tx Rate"]',
            description="CPU load spiked to 98% during off-peak window",
            resolved=False,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)

        assert record.id is not None
        assert record.score == 0.88
        assert record.severity == "CRITICAL"
        assert record.resolved is False

    await test_engine.dispose()
