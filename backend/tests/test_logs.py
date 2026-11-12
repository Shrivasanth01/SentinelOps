import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.services.log_service import log_service
from app.schemas.logs import LogLevelEnum, LogEntryCreate
from app.db.base import Base
from app.models.logs import SystemLogRecord


@pytest.mark.asyncio
async def test_get_logs_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/logs?limit=10")
    assert response.status_code == 200
    data = response.json()

    assert "logs" in data
    assert "total_count" in data
    assert len(data["logs"]) >= 1
    assert "level" in data["logs"][0]
    assert "service" in data["logs"][0]


@pytest.mark.asyncio
async def test_ingest_log_endpoint(client: AsyncClient):
    payload = {
        "level": "WARNING",
        "service": "billing-service",
        "message": "Payment gateway timeout after 5000ms",
        "source_ip": "10.0.4.12",
        "metadata": {"transaction_id": "tx_9981", "retry": 2},
    }
    response = await client.post("/api/v1/logs/ingest", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["level"] == "WARNING"
    assert data["service"] == "billing-service"
    assert data["message"] == "Payment gateway timeout after 5000ms"
    assert data["metadata"]["transaction_id"] == "tx_9981"


@pytest.mark.asyncio
async def test_log_filtering(client: AsyncClient):
    # Ingest a specific test log
    unique_msg = "UniqueSearchKeywordTest_12345"
    log_service.ingest_log(
        LogEntryCreate(
            level=LogLevelEnum.ERROR,
            service="auth-service",
            message=unique_msg,
        )
    )

    # Filter by search keyword
    response = await client.get(f"/api/v1/logs?search=UniqueSearchKeywordTest")
    assert response.status_code == 200
    data = response.json()
    assert any(unique_msg in log["message"] for log in data["logs"])

    # Filter by level
    response_level = await client.get("/api/v1/logs?level=ERROR")
    assert response_level.status_code == 200
    data_level = response_level.json()
    assert all(log["level"] == "ERROR" for log in data_level["logs"])


@pytest.mark.asyncio
async def test_system_log_record_persistence():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        record = SystemLogRecord(
            level="CRITICAL",
            service="cluster-controller",
            message="Node 3 lost quorum heartbeat",
            source_ip="192.168.1.50",
            metadata_json='{"node_id": 3}',
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)

        assert record.id is not None
        assert record.level == "CRITICAL"
        assert record.service == "cluster-controller"
        assert "lost quorum" in record.message

    await test_engine.dispose()

