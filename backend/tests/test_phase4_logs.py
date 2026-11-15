import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.logging_engine.schemas.logs import (
    LogLevelEnum,
    LogSourceTypeEnum,
    LogFormatEnum,
    LogSourceCreate,
    LogSourceUpdate,
    LogEntry,
)
from app.logging_engine.parsers.windows_event_parser import (
    map_windows_level,
    parse_windows_event_dict,
)
from app.logging_engine.parsers.redaction import (
    redact_sensitive_text,
    redact_metadata_dict,
)
from app.logging_engine.parsers.error_grouper import (
    normalize_error_message,
    compute_error_fingerprint,
    group_error_logs,
)
from app.logging_engine.parsers.json_parser import parse_json_log_line
from app.logging_engine.queries.logql_builder import LogQLBuilder
from app.logging_engine.services.loki_client import LokiClient, LokiError
from app.logging_engine.collectors.fastapi_logger import FastAPILogBuffer


# ==============================================================================
# TEST FIXTURES
# ==============================================================================

@pytest.fixture
async def test_db_session():
    """In-memory SQLite session for Phase 4 DB tests."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def phase4_client(test_db_session):
    """FastAPI AsyncClient with get_db overridden to use in-memory SQLite DB."""
    async def _override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.pop(get_db, None)


# ==============================================================================
# 1. PARSER & REDACTION TESTS
# ==============================================================================

def test_windows_event_level_mapping_and_event_id():
    """Verify numeric levels 1..5 map to correct LogLevelEnum and Event ID is distinct."""
    assert map_windows_level(1) == LogLevelEnum.CRITICAL
    assert map_windows_level(2) == LogLevelEnum.ERROR
    assert map_windows_level(3) == LogLevelEnum.WARNING
    assert map_windows_level(4) == LogLevelEnum.INFO
    assert map_windows_level(5) == LogLevelEnum.DEBUG

    # Sample Event Record with distinct EventID and Level
    raw_event = {
        "Id": 7036,
        "Level": 4,
        "Channel": "System",
        "ProviderName": "Service Control Manager",
        "Message": "The Windows Update service entered the running state.",
        "TimeCreated": "2026-11-15T04:00:00Z",
        "MachineName": "SENTINEL-NODE",
    }
    entry = parse_windows_event_dict(raw_event)
    assert entry.event_id == 7036
    assert entry.level == LogLevelEnum.INFO
    assert entry.service == "windows-system"
    assert entry.provider == "Service Control Manager"
    assert entry.computer == "SENTINEL-NODE"
    assert "Windows Update service" in entry.message


def test_redaction_engine_masks_credentials():
    """Verify security redaction removes secrets, tokens, AWS keys, connection strings."""
    secret_text = (
        "User login failed with password='SuperSecretPassword123!' "
        "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.sig "
        "and api_key=ak_live_abcdef1234567890 "
        "connected to postgresql://admin:P@ssword99@localhost:5432/proddb"
    )
    sanitized = redact_sensitive_text(secret_text)
    assert "SuperSecretPassword123!" not in sanitized
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in sanitized
    assert "ak_live_abcdef1234567890" not in sanitized
    assert "admin:P@ssword99" not in sanitized
    assert "[REDACTED]" in sanitized

    # Nested metadata redaction
    meta = {
        "user": "operator",
        "token": "ghp_1234567890abcdefghijklmnopqrstuvwxyz",
        "nested": {"client_secret": "xyz123secret"},
        "ok_field": "system-metric",
    }
    sanitized_meta = redact_metadata_dict(meta)
    assert sanitized_meta["token"] == "[REDACTED]"
    assert sanitized_meta["nested"]["client_secret"] == "[REDACTED]"
    assert sanitized_meta["ok_field"] == "system-metric"


def test_error_grouper_and_fingerprinting():
    """Verify normalization masks variable tokens and produces identical MD5 fingerprints."""
    msg1 = "Connection timeout to db-shard-1 at 192.168.1.10:5432 after 5000ms for task 550e8400-e29b-41d4-a716-446655440000"
    msg2 = "Connection timeout to db-shard-1 at 192.168.1.11:5432 after 7500ms for task 6ba7b810-9dad-11d1-80b4-00c04fd430c8"

    norm1 = normalize_error_message(msg1)
    norm2 = normalize_error_message(msg2)
    assert norm1 == norm2
    assert "<UUID>" in norm1
    assert "<NUM>" in norm1

    fp1 = compute_error_fingerprint(service="db-proxy", normalized_pattern=norm1)
    fp2 = compute_error_fingerprint(service="db-proxy", normalized_pattern=norm2)
    assert fp1 == fp2

    # Grouping test
    now = datetime.now(timezone.utc)
    entries = [
        LogEntry(id="1", timestamp=now, level=LogLevelEnum.ERROR, service="db-proxy", message=msg1),
        LogEntry(id="2", timestamp=now, level=LogLevelEnum.ERROR, service="db-proxy", message=msg2),
        LogEntry(id="3", timestamp=now, level=LogLevelEnum.CRITICAL, service="auth", message="JWT signature expired"),
    ]
    groups = group_error_logs(entries)
    assert len(groups) == 2
    top_group = next(g for g in groups if g.service == "db-proxy")
    assert top_group.count == 2
    assert top_group.fingerprint == fp1


def test_json_log_parser():
    """Verify structured JSON log line parsing and error fallback."""
    json_line = '{"time": "2026-11-15T04:10:00Z", "level": "error", "service": "payment-api", "msg": "Card charge failed", "tx_id": "tx_8877"}'
    entry = parse_json_log_line(json_line, default_service="default")
    assert entry.level == LogLevelEnum.ERROR
    assert entry.service == "payment-api"
    assert entry.message == "Card charge failed"
    assert entry.metadata.get("tx_id") == "tx_8877"

    # Raw fallback
    bad_line = "Just a plain unformatted crash dump string 0xdeadbeef"
    fallback = parse_json_log_line(bad_line, default_service="raw-app")
    assert fallback.service == "raw-app"
    assert "0xdeadbeef" in fallback.message


# ==============================================================================
# 2. LOGQL BUILDER TESTS
# ==============================================================================

def test_logql_builder():
    """Verify safe LogQL query generation with low-cardinality selectors."""
    # Basic query
    q1 = LogQLBuilder.build_stream_query(job="sentinelops", service="api-gateway", level=LogLevelEnum.ERROR)
    assert '{job="sentinelops", service="api-gateway", level="ERROR"}' in q1

    # Search filter with special characters escaped
    q2 = LogQLBuilder.build_stream_query(search='Timeout "500ms" \\ fatal')
    assert '|= "Timeout \\"500ms\\" \\\\ fatal"' in q2

    # Metric aggregation
    q3 = LogQLBuilder.build_metric_query(operation="rate", duration="5m")
    assert "rate({" in q3
    assert "[5m]" in q3


# ==============================================================================
# 3. FASTAPI BUFFER & IN-MEMORY TESTS
# ==============================================================================

def test_fastapi_log_buffer():
    """Verify in-memory ring buffer FIFO eviction and severity filtering."""
    buf = FastAPILogBuffer(max_size=3)
    buf._buffer.clear()

    now = datetime.now(timezone.utc)
    buf.append(LogEntry(id="1", timestamp=now, level=LogLevelEnum.INFO, service="svc-a", message="Info 1"))
    buf.append(LogEntry(id="2", timestamp=now, level=LogLevelEnum.ERROR, service="svc-b", message="Error 2"))
    buf.append(LogEntry(id="3", timestamp=now, level=LogLevelEnum.INFO, service="svc-a", message="Info 3"))
    buf.append(LogEntry(id="4", timestamp=now, level=LogLevelEnum.CRITICAL, service="svc-b", message="Crit 4"))

    # Size must be capped at 3 (item 1 evicted)
    assert buf.count() == 3
    recent = buf.get_recent(limit=10)
    assert len(recent) == 3
    ids = [r.id for r in recent]
    assert "1" not in ids
    assert "4" in ids

    # Filter by level
    errors = buf.get_recent(limit=10, level=LogLevelEnum.ERROR)
    assert len(errors) == 1
    assert errors[0].id == "2"


# ==============================================================================
# 4. LOG SOURCE VALIDATION TESTS
# ==============================================================================

def test_log_source_path_traversal_protection():
    """Verify security validation prevents path traversal and protected directories."""
    # Disallow relative path traversal
    with pytest.raises(ValueError, match="prohibited"):
        LogSourceCreate(
            name="Traversal Attack",
            source_type=LogSourceTypeEnum.FILE,
            channel_or_path="../../etc/shadow",
        )

    # Disallow Linux protected system paths
    with pytest.raises(ValueError, match="prohibited"):
        LogSourceCreate(
            name="Shadow File",
            source_type=LogSourceTypeEnum.FILE,
            channel_or_path="/etc/passwd",
        )

    # Disallow Windows protected system directories
    with pytest.raises(ValueError, match="prohibited"):
        LogSourceCreate(
            name="System Directory",
            source_type=LogSourceTypeEnum.FILE,
            channel_or_path="C:\\Windows\\System32\\config\\SAM",
        )


def test_log_source_security_channel_requires_authorization():
    """Verify Windows Security event log requires explicit authorization."""
    with pytest.raises(ValueError, match="Security channel collection requires explicit administrative authorization"):
        LogSourceCreate(
            name="Security Log",
            source_type=LogSourceTypeEnum.WINDOWS_EVENT,
            channel_or_path="Security",
        )


# ==============================================================================
# 5. REST API ENDPOINT TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_api_logs_query_endpoint(phase4_client: AsyncClient):
    """GET /api/v1/logs returns structured result with pagination."""
    resp = await phase4_client.get("/api/v1/logs?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "logs" in data
    assert "total" in data
    assert "total_count" in data
    assert isinstance(data["logs"], list)
    assert len(data["logs"]) >= 1


@pytest.mark.asyncio
async def test_api_logs_search_endpoint(phase4_client: AsyncClient):
    """GET /api/v1/logs/search filters logs by query term."""
    resp = await phase4_client.get("/api/v1/logs/search?q=sentinel&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "logs" in data
    assert "query_used" in data


@pytest.mark.asyncio
async def test_api_logs_summary_endpoint(phase4_client: AsyncClient):
    """GET /api/v1/logs/summary returns counts by severity and volume rate."""
    resp = await phase4_client.get("/api/v1/logs/summary?time_range=1h")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_logs" in data
    assert "level_distribution" in data
    assert "INFO" in data["level_distribution"]


@pytest.mark.asyncio
async def test_api_logs_errors_intelligence_endpoint(phase4_client: AsyncClient):
    """GET /api/v1/logs/errors returns grouped error patterns."""
    resp = await phase4_client.get("/api/v1/logs/errors?time_range=1h")
    assert resp.status_code == 200
    data = resp.json()
    assert "groups" in data
    assert "total_errors" in data
    assert isinstance(data["groups"], list)


@pytest.mark.asyncio
async def test_api_logs_timeline_endpoint(phase4_client: AsyncClient):
    """GET /api/v1/logs/timeline returns chronological distribution buckets."""
    resp = await phase4_client.get("/api/v1/logs/timeline?time_range=1h")
    assert resp.status_code == 200
    data = resp.json()
    assert "buckets" in data
    assert isinstance(data["buckets"], list)


@pytest.mark.asyncio
async def test_api_logs_health_endpoint(phase4_client: AsyncClient):
    """GET /api/v1/logs/health returns Loki and collectors status."""
    resp = await phase4_client.get("/api/v1/logs/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "loki_status" in data
    assert "loki_url" in data
    assert "sources_configured" in data


@pytest.mark.asyncio
async def test_api_logs_correlate_endpoint(phase4_client: AsyncClient):
    """GET /api/v1/logs/correlate requires timestamp and includes causation disclaimer."""
    now_epoch = datetime.now(timezone.utc).timestamp()
    resp = await phase4_client.get(
        f"/api/v1/logs/correlate?metric_name=cpu_utilization&timestamp={now_epoch}&window_seconds=300"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "metric_event_timestamp" in data
    assert "logs" in data
    assert "disclaimer" in data
    assert "does not establish a causal relationship" in data["disclaimer"]


@pytest.mark.asyncio
async def test_api_logs_sources_crud(phase4_client: AsyncClient):
    """Verify log sources CRUD lifecycle using in-memory DB override."""
    # 1. List default sources
    list_resp = await phase4_client.get("/api/v1/logs/sources")
    assert list_resp.status_code == 200
    sources_data = list_resp.json()
    assert "sources" in sources_data
    assert sources_data["total"] >= 1

    # 2. Register custom source
    new_src = {
        "name": "Audit Custom Worker",
        "source_type": "APPLICATION_LOG",
        "channel_or_path": "logs/worker.log",
        "description": "Integration test worker log source",
        "format": "JSON",
        "enabled": True,
    }
    create_resp = await phase4_client.post("/api/v1/logs/sources", json=new_src)
    assert create_resp.status_code == 201
    created = create_resp.json()
    source_id = created["id"]
    assert created["name"] == "Audit Custom Worker"
    assert created["channel_or_path"] == "logs/worker.log"

    # 3. Get single source
    get_resp = await phase4_client.get(f"/api/v1/logs/sources/{source_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == source_id

    # 4. Patch source
    patch_resp = await phase4_client.patch(
        f"/api/v1/logs/sources/{source_id}",
        json={"description": "Updated worker description", "enabled": False},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["description"] == "Updated worker description"
    assert patch_resp.json()["enabled"] is False

    # 5. Delete source (204 No Content)
    del_resp = await phase4_client.delete(f"/api/v1/logs/sources/{source_id}")
    assert del_resp.status_code == 204

    # 6. Verify 404 after deletion
    get_again = await phase4_client.get(f"/api/v1/logs/sources/{source_id}")
    assert get_again.status_code == 404
