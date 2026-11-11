import pytest
from httpx import AsyncClient
from app.core.exceptions import DatabaseConnectionError, ResourceNotFoundError
from app.core.config import Settings


@pytest.mark.asyncio
async def test_404_error_handling(client: AsyncClient):
    response = await client.get("/api/v1/nonexistent-route")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "HTTP_404"
    assert "correlation_id" in data["error"]
    assert "timestamp" in data["error"]


@pytest.mark.asyncio
async def test_settings_cors_parsing():
    s = Settings(BACKEND_CORS_ORIGINS=["http://test1.com", "http://test2.com"])
    assert "http://test1.com" in s.BACKEND_CORS_ORIGINS

    s2 = Settings(BACKEND_CORS_ORIGINS="http://test3.com, http://test4.com")
    assert "http://test3.com" in s2.BACKEND_CORS_ORIGINS
    assert "http://test4.com" in s2.BACKEND_CORS_ORIGINS


@pytest.mark.asyncio
async def test_custom_exception_response(client: AsyncClient):
    from fastapi import APIRouter
    from app.main import app

    test_router = APIRouter()

    @test_router.get("/trigger-db-error")
    async def trigger():
        raise DatabaseConnectionError(
            message="Simulated connection timeout",
            details={"host": "postgres-cluster", "port": 5432},
        )

    app.include_router(test_router, prefix="/api/v1/test")

    response = await client.get("/api/v1/test/trigger-db-error")
    assert response.status_code == 503
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "DATABASE_UNAVAILABLE"
    assert "Simulated connection timeout" in data["error"]["message"]
    assert data["error"]["details"]["host"] == "postgres-cluster"

