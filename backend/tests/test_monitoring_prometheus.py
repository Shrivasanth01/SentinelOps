import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

from app.main import app
from app.monitoring.prometheus_client import (
    PrometheusClient,
    PrometheusConnectionError,
    PrometheusQueryError,
)
from app.monitoring.services import (
    CpuMonitoringService,
    DiskMonitoringService,
    HealthMonitoringService,
    HistoryMonitoringService,
    MemoryMonitoringService,
    NetworkMonitoringService,
    OverviewMonitoringService,
)
from app.schemas.monitoring import (
    CpuMetricData,
    DiskMetricData,
    DiskVolumeData,
    HealthState,
    MemoryMetricData,
    TargetHealth,
)


@pytest.fixture
def mock_prometheus_client():
    client = PrometheusClient(base_url="http://mock-prometheus:9090")
    client.check_health = AsyncMock(return_value=True)
    return client


@pytest.mark.asyncio
async def test_prometheus_client_instant_query_mock():
    client = PrometheusClient(base_url="http://mock-prometheus:9090")
    mock_response = {
        "status": "success",
        "data": {
            "resultType": "vector",
            "result": [
                {
                    "metric": {"__name__": "test_metric", "instance": "host1"},
                    "value": [1700000000.0, "42.5"],
                }
            ],
        },
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json = lambda: mock_response

        res = await client.query("test_metric")
        assert res["resultType"] == "vector"
        val = client.extract_single_value(res)
        assert val == 42.5


@pytest.mark.asyncio
async def test_prometheus_client_connection_error():
    client = PrometheusClient(base_url="http://invalid-prometheus:9090")
    with patch("httpx.AsyncClient.get", side_effect=PrometheusConnectionError("Offline")):
        with pytest.raises(PrometheusConnectionError):
            await client.query("windows_cpu_time_seconds_total")


@pytest.mark.asyncio
async def test_cpu_service_metrics(mock_prometheus_client):
    service = CpuMonitoringService(mock_prometheus_client)

    # Mock queries
    async def mock_query(expr, time=None):
        if "overall" in expr or "idle" in expr:
            return {
                "resultType": "vector",
                "result": [{"metric": {}, "value": [1700000000.0, "15.0"]}],
            }
        return {"resultType": "vector", "result": []}

    mock_prometheus_client.query = AsyncMock(side_effect=mock_query)

    cpu_data = await service.get_cpu_metrics()
    assert cpu_data.overall_percent == 15.0
    assert cpu_data.idle_percent == 85.0
    assert cpu_data.status == HealthState.HEALTHY


@pytest.mark.asyncio
async def test_memory_service_metrics(mock_prometheus_client):
    service = MemoryMonitoringService(mock_prometheus_client)

    async def mock_query(expr, time=None):
        if "free" in expr or "available" in expr:
            return {
                "resultType": "vector",
                "result": [{"metric": {}, "value": [1700000000.0, "4000000000"]}],
            }
        elif "total" in expr or "physical_memory" in expr:
            return {
                "resultType": "vector",
                "result": [{"metric": {}, "value": [1700000000.0, "16000000000"]}],
            }
        return {"resultType": "vector", "result": []}

    mock_prometheus_client.query = AsyncMock(side_effect=mock_query)

    mem_data = await service.get_memory_metrics()
    assert mem_data.total_bytes == 16000000000
    assert mem_data.free_bytes == 4000000000
    assert mem_data.used_bytes == 12000000000
    assert mem_data.percent == 75.0
    assert mem_data.status == HealthState.HEALTHY


@pytest.mark.asyncio
async def test_disk_service_metrics(mock_prometheus_client):
    service = DiskMonitoringService(mock_prometheus_client)

    async def mock_query(expr, time=None):
        if "size_bytes" in expr:
            return {
                "resultType": "vector",
                "result": [{"metric": {"volume": "C:"}, "value": [1700000000.0, "500000000000"]}],
            }
        elif "free_bytes" in expr:
            return {
                "resultType": "vector",
                "result": [{"metric": {"volume": "C:"}, "value": [1700000000.0, "250000000000"]}],
            }
        elif "read_bytes" in expr or "write_bytes" in expr:
            return {
                "resultType": "vector",
                "result": [{"metric": {}, "value": [1700000000.0, "1048576"]}],
            }
        return {"resultType": "vector", "result": []}

    mock_prometheus_client.query = AsyncMock(side_effect=mock_query)

    disk_data = await service.get_disk_metrics()
    assert len(disk_data.volumes) == 1
    assert disk_data.volumes[0].volume == "C:"
    assert disk_data.volumes[0].percent == 50.0
    assert disk_data.volumes[0].status == HealthState.HEALTHY
    assert disk_data.total_read_bytes_per_sec == 1048576.0


@pytest.mark.asyncio
async def test_health_evaluation_thresholds():
    health_service = HealthMonitoringService(PrometheusClient())
    health_service.get_targets_status = AsyncMock()
    health_service.get_targets_status.return_value.targets = []
    health_service.get_targets_status.return_value.up_targets = 1
    health_service.client.check_health = AsyncMock(return_value=True)

    # 1. Healthy state
    cpu_healthy = CpuMetricData(overall_percent=45.0, status=HealthState.HEALTHY)
    mem_healthy = MemoryMetricData(percent=60.0, status=HealthState.HEALTHY)
    h_data, _ = await health_service.evaluate_health(cpu=cpu_healthy, memory=mem_healthy)
    assert h_data.state == HealthState.HEALTHY

    # 2. Warning state
    cpu_warn = CpuMetricData(overall_percent=78.0, status=HealthState.WARNING)
    h_data, _ = await health_service.evaluate_health(cpu=cpu_warn, memory=mem_healthy)
    assert h_data.state == HealthState.WARNING
    assert any("78.0%" in r for r in h_data.reasons)

    # 3. Critical state
    mem_crit = MemoryMetricData(percent=94.5, status=HealthState.CRITICAL)
    h_data, _ = await health_service.evaluate_health(cpu=cpu_warn, memory=mem_crit)
    assert h_data.state == HealthState.CRITICAL
    assert any("94.5%" in r for r in h_data.reasons)


@pytest.mark.asyncio
async def test_api_monitoring_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Overview
        resp = await client.get("/api/v1/monitoring/overview")
        assert resp.status_code == 200
        overview = resp.json()
        assert "health" in overview
        assert "cpu" in overview
        assert "memory" in overview
        assert "disk" in overview
        assert "network" in overview
        assert "system" in overview
        assert "targets" in overview

        # 2. CPU
        resp = await client.get("/api/v1/monitoring/cpu")
        assert resp.status_code == 200
        cpu = resp.json()
        assert "status" in cpu
        assert "timestamp" in cpu

        # 3. Memory
        resp = await client.get("/api/v1/monitoring/memory")
        assert resp.status_code == 200
        mem = resp.json()
        assert "status" in mem

        # 4. Disk
        resp = await client.get("/api/v1/monitoring/disk")
        assert resp.status_code == 200
        disk = resp.json()
        assert "volumes" in disk

        # 5. Network
        resp = await client.get("/api/v1/monitoring/network")
        assert resp.status_code == 200
        net = resp.json()
        assert "interfaces" in net

        # 6. System
        resp = await client.get("/api/v1/monitoring/system")
        assert resp.status_code == 200
        sys = resp.json()
        assert "os_name" in sys

        # 7. Targets
        resp = await client.get("/api/v1/monitoring/targets")
        assert resp.status_code == 200
        targets = resp.json()
        assert "targets" in targets

        # 8. History
        resp = await client.get("/api/v1/monitoring/history?duration=5m&step=15s")
        assert resp.status_code == 200
        history = resp.json()
        assert "series" in history
        assert "step" in history


@pytest.mark.asyncio
async def test_degraded_offline_prometheus():
    """Verifies that when Prometheus is offline, API endpoints return graceful fallback schemas without crashing."""
    from app.api.v1.endpoints.monitoring import get_prometheus_client

    offline_client = PrometheusClient(base_url="http://offline-prometheus:9090")
    offline_client.check_health = AsyncMock(return_value=False)
    offline_client.query = AsyncMock(side_effect=PrometheusConnectionError("Service offline"))
    offline_client.query_range = AsyncMock(side_effect=PrometheusConnectionError("Service offline"))
    offline_client.get_targets = AsyncMock(side_effect=PrometheusConnectionError("Service offline"))

    app.dependency_overrides[get_prometheus_client] = lambda: offline_client

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/v1/monitoring/overview")
            assert resp.status_code == 200
            data = resp.json()
            assert data["health"]["state"] in ("UNKNOWN", "CRITICAL")
            assert data["health"]["prometheus_connected"] is False
            # Never fabricate metrics
            assert data["cpu"]["overall_percent"] is None
            assert data["memory"]["percent"] is None
    finally:
        app.dependency_overrides.pop(get_prometheus_client, None)
