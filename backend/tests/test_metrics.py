import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.monitoring.collector import metrics_collector
from app.services.metrics_service import metrics_service
from app.db.base import Base
from app.models.metric_snapshot import MetricSnapshotRecord


@pytest.mark.asyncio
async def test_system_metrics_collector():
    snapshot = metrics_collector.snapshot()

    assert snapshot.host_name is not None
    assert snapshot.platform is not None

    # CPU metrics
    assert 0.0 <= snapshot.cpu.overall_percent <= 100.0
    assert snapshot.cpu.count_logical >= 1
    assert len(snapshot.cpu.per_cpu_percent) >= 1

    # Memory metrics
    assert snapshot.memory.total_bytes > 0
    assert snapshot.memory.available_bytes > 0
    assert 0.0 <= snapshot.memory.percent <= 100.0

    # Disk metrics
    assert isinstance(snapshot.disk.partitions, list)

    # Network metrics
    assert snapshot.network.total_bytes_sent >= 0
    assert snapshot.network.total_bytes_recv >= 0

    # System metrics
    assert snapshot.system.process_count > 0
    assert snapshot.system.uptime_seconds > 0


@pytest.mark.asyncio
async def test_metrics_current_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/metrics/current")
    assert response.status_code == 200
    data = response.json()

    assert "cpu" in data
    assert "memory" in data
    assert "disk" in data
    assert "network" in data
    assert "system" in data
    assert "host_name" in data


@pytest.mark.asyncio
async def test_metrics_history_endpoint(client: AsyncClient):
    # Prime buffer with a snapshot
    metrics_service.record_snapshot()

    response = await client.get("/api/v1/metrics/history?limit=10")
    assert response.status_code == 200
    data = response.json()

    assert "snapshots" in data
    assert len(data["snapshots"]) >= 1
    assert data["total_count"] >= 1
    assert "sampling_interval_seconds" in data


@pytest.mark.asyncio
async def test_metrics_summary_endpoint(client: AsyncClient):
    # Prime buffer
    metrics_service.record_snapshot()

    response = await client.get("/api/v1/metrics/summary?window_seconds=300")
    assert response.status_code == 200
    data = response.json()

    assert data["sample_count"] >= 1
    assert 0.0 <= data["cpu_percent_avg"] <= 100.0
    assert 0.0 <= data["memory_percent_avg"] <= 100.0


@pytest.mark.asyncio
async def test_prometheus_endpoint(client: AsyncClient):
    metrics_service.record_snapshot()

    # Test both /metrics root and /api/v1/metrics/prometheus
    resp1 = await client.get("/metrics")
    assert resp1.status_code == 200
    assert b"sentinelops_cpu_utilization_percent" in resp1.content
    assert b"sentinelops_memory_utilization_percent" in resp1.content

    resp2 = await client.get("/api/v1/metrics/prometheus")
    assert resp2.status_code == 200
    assert b"sentinelops_cpu_utilization_percent" in resp2.content


@pytest.mark.asyncio
async def test_metric_snapshot_record_persistence():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        record = MetricSnapshotRecord(
            cpu_percent=42.5,
            memory_percent=68.2,
            disk_percent=55.0,
            network_sent_bytes=1048576,
            network_recv_bytes=2097152,
            process_count=180,
            payload_json='{"sample": true}',
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)

        assert record.id is not None
        assert record.cpu_percent == 42.5
        assert record.memory_percent == 68.2
        assert record.network_sent_bytes == 1048576
        assert record.process_count == 180

    await test_engine.dispose()

