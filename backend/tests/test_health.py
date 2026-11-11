import pytest
from httpx import AsyncClient
from unittest.mock import patch
from app.core.config import settings


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == settings.PROJECT_NAME
    assert data["tagline"] == settings.TAGLINE
    assert data["version"] == settings.VERSION


@pytest.mark.asyncio
async def test_health_liveness_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == settings.PROJECT_NAME
    assert data["version"] == settings.VERSION
    assert "uptime_seconds" in data
    assert data["uptime_seconds"] >= 0
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_health_readiness_healthy(client: AsyncClient):
    # Mock check_database_connectivity returning healthy
    with patch(
        "app.services.health_service.check_database_connectivity",
        return_value=(True, 1.25, {"pool_size": 10, "checked_in": 10, "checked_out": 0, "overflow": 0}),
    ):
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"]["status"] == "healthy"
        assert data["database"]["connected"] is True
        assert data["database"]["latency_ms"] == 1.25
        assert data["database"]["pool_info"]["pool_size"] == 10
        assert data["database"]["error"] is None


@pytest.mark.asyncio
async def test_health_readiness_unhealthy(client: AsyncClient):
    # Mock check_database_connectivity returning failure
    with patch(
        "app.services.health_service.check_database_connectivity",
        return_value=(False, 3005.0, {"error": "Connection refused to PostgreSQL host"}),
    ):
        response = await client.get("/api/v1/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"]["status"] == "unhealthy"
        assert data["database"]["connected"] is False
        assert "Connection refused" in data["database"]["error"]


@pytest.mark.asyncio
async def test_system_info_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/health/info")
    assert response.status_code == 200
    data = response.json()
    assert data["project_name"] == settings.PROJECT_NAME
    assert data["tagline"] == settings.TAGLINE
    assert data["version"] == settings.VERSION
    assert "python_version" in data
    assert "os_platform" in data


@pytest.mark.asyncio
async def test_correlation_id_and_timing_headers(client: AsyncClient):
    custom_id = "test-sentinel-uuid-12345"
    response = await client.get("/api/v1/health/live", headers={"X-Correlation-ID": custom_id})
    assert response.status_code == 200
    assert response.headers.get("X-Correlation-ID") == custom_id
    assert "X-Response-Time-MS" in response.headers
    assert float(response.headers["X-Response-Time-MS"]) >= 0.0


@pytest.mark.asyncio
async def test_cors_preflight(client: AsyncClient):
    origin = "http://localhost:3000"
    response = await client.options(
        "/api/v1/health/live",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin

