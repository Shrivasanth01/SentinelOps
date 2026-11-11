import sys
import time
import asyncio
import logging

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from typing import AsyncGenerator, Dict, Any, Tuple
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

logger = logging.getLogger("sentinelops.db")

# Engine options
engine_kwargs: Dict[str, Any] = {
    "echo": settings.DEBUG,
}

# SQLite does not support standard queue pool options
if "sqlite" not in settings.ASYNC_DATABASE_URL:
    engine_kwargs.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_pre_ping": settings.DB_POOL_PRE_PING,
    })

# Initialize async engine
async_engine: AsyncEngine = create_async_engine(
    settings.ASYNC_DATABASE_URL,
    **engine_kwargs,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an independent AsyncSession per request.
    Rolls back uncommitted transactions if an exception occurs.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_connectivity(timeout: float = 3.0) -> Tuple[bool, float, Dict[str, Any]]:
    """
    Pings the database using a simple SELECT 1 query and returns:
    (is_healthy, latency_ms, metadata)
    """
    start_time = time.perf_counter()
    try:
        async with async_engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            val = result.scalar()
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            # Pool information if available
            pool = async_engine.pool
            pool_info = {
                "pool_size": pool.size() if hasattr(pool, "size") else 0,
                "checked_in": pool.checkedin() if hasattr(pool, "checkedin") else 0,
                "checked_out": pool.checkedout() if hasattr(pool, "checkedout") else 0,
                "overflow": pool.overflow() if hasattr(pool, "overflow") else 0,
            }

            return val == 1, latency_ms, pool_info
    except Exception as exc:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.warning(f"Database health check failed ({latency_ms}ms): {exc}")
        return False, latency_ms, {"error": str(exc)}


async def close_db_connections() -> None:
    """Gracefully closes all connections in the connection pool."""
    logger.info("Closing database connection pool...")
    await async_engine.dispose()
    logger.info("Database connection pool closed.")

