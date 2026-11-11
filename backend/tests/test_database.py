import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.db.base import Base
from app.models.audit import HealthCheckAuditLog


@pytest.mark.asyncio
async def test_health_check_audit_model():
    # Use in-memory SQLite to test model creation and queries
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        log_entry = HealthCheckAuditLog(
            status="HEALTHY",
            db_connected=True,
            db_latency_ms=2.45,
            details="Initial test probe record",
        )
        session.add(log_entry)
        await session.commit()
        await session.refresh(log_entry)

        assert log_entry.id is not None
        assert log_entry.status == "HEALTHY"
        assert log_entry.db_connected is True
        assert log_entry.db_latency_ms == 2.45
        assert log_entry.timestamp is not None
        assert "Initial test probe" in log_entry.details

    await test_engine.dispose()

