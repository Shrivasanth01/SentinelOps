import pytest
from unittest.mock import AsyncMock
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.schemas.analytics import TimeRangeEnum, DeviationStatusEnum
from app.services.baseline_service import BaselineService
from app.monitoring.prometheus_client import PrometheusClient


@pytest.fixture
async def test_db_session():
    """Create in-memory SQLite async engine & session for Phase 3 tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def phase3_client(test_db_session):
    """FastAPI AsyncClient with get_db overridden to use test in-memory database."""
    async def _override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_historical_analytics_cpu_memory_disk_network(phase3_client: AsyncClient):
    """Verifies historical analytics endpoints across CPU, Memory, Disk, and Network with time ranges."""
    # 1. CPU History (15m)
    resp = await phase3_client.get("/api/v1/analytics/cpu/history?range=15m")
    assert resp.status_code == 200
    data = resp.json()
    assert data["subsystem"] == "cpu"
    assert data["time_range"] == "15m"
    assert "points" in data
    assert "stats" in data
    assert "mean" in data["stats"]
    assert "min" in data["stats"]
    assert "max" in data["stats"]
    assert "trend" in data["stats"]

    # 2. Memory History (1h)
    resp = await phase3_client.get("/api/v1/analytics/memory/history?time_range=1h")
    assert resp.status_code == 200
    data = resp.json()
    assert data["subsystem"] == "memory"
    assert data["time_range"] == "1h"
    assert "stats" in data

    # 3. Disk History (6h)
    resp = await phase3_client.get("/api/v1/analytics/disk/history?range=6h")
    assert resp.status_code == 200
    data = resp.json()
    assert data["subsystem"] == "disk"
    assert data["time_range"] == "6h"

    # 4. Network History (24h)
    resp = await phase3_client.get("/api/v1/analytics/network/history?range=24h")
    assert resp.status_code == 200
    data = resp.json()
    assert data["subsystem"] == "network"
    assert data["time_range"] == "24h"


@pytest.mark.asyncio
async def test_historical_analytics_invalid_range(phase3_client: AsyncClient):
    """Verifies that unwhitelisted time range queries are rejected with 422."""
    resp = await phase3_client.get("/api/v1/analytics/cpu/history?range=99d")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_performance_baselines_insufficient_data():
    """Verifies baseline engine reports INSUFFICIENT_DATA when sample points are below threshold."""
    mock_client = AsyncMock(spec=PrometheusClient)
    # Return range query with only 3 points (less than min 10)
    mock_client.query_range.return_value = {
        "result": [
            {
                "metric": {},
                "values": [[1700000000, "25.0"], [1700000300, "26.0"], [1700000600, "25.5"]]
            }
        ]
    }
    mock_client.query.return_value = {
        "result": [{"value": [1700000900, "25.8"]}]
    }
    mock_client.extract_single_value.return_value = 25.8

    svc = BaselineService(client=mock_client)
    res = await svc.get_baselines()

    assert res.total_metrics >= 1
    cpu_b = next((b for b in res.baselines if b.metric_key == "cpu_utilization"), None)
    assert cpu_b is not None
    assert cpu_b.has_sufficient_data is False
    assert cpu_b.deviation_status == DeviationStatusEnum.INSUFFICIENT_DATA
    assert "Insufficient historical samples" in cpu_b.deviation_message


@pytest.mark.asyncio
async def test_performance_baselines_nominal_and_anomalous():
    """Verifies baseline engine computes statistical mean, median, stddev and detects deviations."""
    mock_client = AsyncMock(spec=PrometheusClient)

    # 15 normal sample values around 30.0
    normal_values = [[1700000000 + i * 300, f"{30.0 + (i % 3) * 0.5}"] for i in range(15)]
    mock_client.query_range.return_value = {
        "result": [{"metric": {}, "values": normal_values}]
    }

    # Case A: Live value is nominal (30.5)
    mock_client.query.return_value = {"result": [{"value": [1700005000, "30.5"]}]}
    mock_client.extract_single_value.return_value = 30.5

    svc = BaselineService(client=mock_client)
    res = await svc.get_baselines()
    cpu_b = next((b for b in res.baselines if b.metric_key == "cpu_utilization"), None)
    assert cpu_b is not None
    assert cpu_b.has_sufficient_data is True
    assert cpu_b.historical_mean is not None
    assert cpu_b.historical_median is not None
    assert cpu_b.historical_stddev is not None
    assert cpu_b.z_score is not None
    assert cpu_b.deviation_status == DeviationStatusEnum.NOMINAL

    # Case B: Live value is a massive surge (95.0) -> Critical deviation (|Z| >= 3.0)
    mock_client.query.return_value = {"result": [{"value": [1700005000, "95.0"]}]}
    mock_client.extract_single_value.return_value = 95.0

    res_anom = await svc.get_baselines()
    cpu_anom = next((b for b in res_anom.baselines if b.metric_key == "cpu_utilization"), None)
    assert cpu_anom is not None
    assert cpu_anom.z_score > 3.0
    assert cpu_anom.deviation_status == DeviationStatusEnum.CRITICAL_DEVIATION
    assert "Critical surge" in cpu_anom.deviation_message


@pytest.mark.asyncio
async def test_baselines_endpoint(phase3_client: AsyncClient):
    """Verifies GET /api/v1/analytics/baselines endpoint response."""
    resp = await phase3_client.get("/api/v1/analytics/baselines?baseline_duration=24h")
    assert resp.status_code == 200
    data = resp.json()
    assert "baselines" in data
    assert "total_metrics" in data
    assert "timestamp" in data
    assert "deviations_detected" in data


@pytest.mark.asyncio
async def test_analytics_summary_endpoint(phase3_client: AsyncClient):
    """Verifies GET /api/v1/analytics/summary synthesizes stability index and trends."""
    resp = await phase3_client.get("/api/v1/analytics/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_stability_score" in data
    assert 0 <= data["overall_stability_score"] <= 100
    assert "system_status" in data
    assert "service_availability_percent" in data
    assert "critical_trends" in data


@pytest.mark.asyncio
async def test_monitored_services_crud_and_ssrf(phase3_client: AsyncClient):
    """Verifies CRUD operations on monitored services and strict SSRF blocking."""
    # 1. SSRF prevention: Blocking AWS / GCP / Azure metadata endpoint
    bad_target = {
        "name": "CloudMetadataAttack",
        "target_url": "http://169.254.169.254/latest/meta-data/",
        "protocol": "HTTP",
        "probe_module": "http_2xx",
        "probe_interval_seconds": 30,
        "timeout_seconds": 3.0,
    }
    resp = await phase3_client.post("/api/v1/services", json=bad_target)
    assert resp.status_code == 422
    assert "metadata" in resp.text.lower() or "prohibited" in resp.text.lower()

    # 2. SSRF prevention: Blocking Google internal metadata endpoint
    bad_target_gcp = {
        "name": "GcpMetadataAttack",
        "target_url": "http://metadata.google.internal/computeMetadata/v1/",
        "protocol": "HTTP",
        "probe_module": "http_2xx",
    }
    resp = await phase3_client.post("/api/v1/services", json=bad_target_gcp)
    assert resp.status_code == 422

    # 3. Valid target creation
    valid_target = {
        "name": "FastAPI Liveness Probe",
        "target_url": "http://127.0.0.1:8000/api/v1/health/liveness",
        "protocol": "HTTP",
        "probe_module": "http_2xx",
        "expected_status_code": 200,
        "probe_interval_seconds": 15,
        "timeout_seconds": 4.0,
        "description": "Internal sentinelops backend liveness",
        "tags": "core,internal,backend",
    }
    resp = await phase3_client.post("/api/v1/services", json=valid_target)
    assert resp.status_code == 201
    created = resp.json()
    assert created["name"] == "FastAPI Liveness Probe"
    assert created["target_url"] == "http://127.0.0.1:8000/api/v1/health/liveness"
    service_id = created["id"]

    # 4. List services
    resp = await phase3_client.get("/api/v1/services")
    assert resp.status_code == 200
    services_list = resp.json()
    assert services_list["total"] >= 1
    assert any(s["id"] == service_id for s in services_list["services"])

    # 5. Get service details
    resp = await phase3_client.get(f"/api/v1/services/{service_id}")
    assert resp.status_code == 200
    fetched = resp.json()
    assert fetched["id"] == service_id
    assert fetched["name"] == "FastAPI Liveness Probe"

    # 6. Update service
    update_payload = {
        "name": "Updated FastAPI Probe",
        "timeout_seconds": 7.5,
        "enabled": True,
    }
    resp = await phase3_client.patch(f"/api/v1/services/{service_id}", json=update_payload)
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["name"] == "Updated FastAPI Probe"
    assert updated["timeout_seconds"] == 7.5

    # 7. Delete service
    resp = await phase3_client.delete(f"/api/v1/services/{service_id}")
    assert resp.status_code == 204

    # 8. Service should no longer exist (404)
    resp = await phase3_client.get(f"/api/v1/services/{service_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_windows_services_overview(phase3_client: AsyncClient):
    """Verifies GET /api/v1/services/windows/overview returns service telemetry or fallback."""
    resp = await phase3_client.get("/api/v1/services/windows/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "services" in data
    assert "total_services_monitored" in data
    assert "running_count" in data
    assert "stopped_count" in data
    assert "collector_enabled" in data


@pytest.mark.asyncio
async def test_infrastructure_topology_endpoint(phase3_client: AsyncClient):
    """Verifies GET /api/v1/topology delivers full nodes, edges, and relationship architecture."""
    resp = await phase3_client.get("/api/v1/topology")
    assert resp.status_code == 200
    topo = resp.json()

    assert "nodes" in topo
    assert "edges" in topo
    assert "total_nodes" in topo
    assert "total_edges" in topo
    assert "health_summary" in topo

    node_ids = {n["id"] for n in topo["nodes"]}
    assert "node-host" in node_ids
    assert "node-prometheus" in node_ids
    assert "node-backend" in node_ids

    # Verify edge connectivity
    edge_pairs = {(e["source"], e["target"]) for e in topo["edges"]}
    assert ("node-host", "node-exporter-windows") in edge_pairs
    assert ("node-exporter-windows", "node-prometheus") in edge_pairs
    assert ("node-prometheus", "node-backend") in edge_pairs
