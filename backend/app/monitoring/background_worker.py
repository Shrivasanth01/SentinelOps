import asyncio
import logging
from typing import Optional

logger = logging.getLogger("sentinelops.monitoring.worker")

_stop_event = asyncio.Event()
_worker_task: Optional[asyncio.Task] = None


async def metrics_sampling_loop(interval: float = 5.0, db_flush_interval_ticks: int = 6) -> None:
    """
    Background sampling coroutine executing periodic host metrics collection.
    Runs non-blocking sampling every `interval` seconds and periodically flushes to DB.
    """
    from app.services.metrics_service import metrics_service

    logger.info(f"Starting metrics background sampling worker (cadence: {interval}s)...")
    tick = 0

    while not _stop_event.is_set():
        try:
            snapshot = metrics_service.record_snapshot()
            tick += 1

            # Persist to database periodically (e.g. every 30 seconds)
            if tick % db_flush_interval_ticks == 0:
                await metrics_service.persist_snapshot_to_db(snapshot)

        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error(f"Error during metrics background collection tick: {exc}")

        try:
            await asyncio.wait_for(_stop_event.wait(), timeout=interval)
        except asyncio.TimeoutError:
            pass

    logger.info("Metrics background sampling worker stopped.")


def start_metrics_worker(interval: float = 5.0) -> None:
    """Starts the metrics background sampling worker task."""
    global _worker_task, _stop_event
    _stop_event.clear()
    _worker_task = asyncio.create_task(metrics_sampling_loop(interval=interval))


async def stop_metrics_worker() -> None:
    """Gracefully signals the metrics background sampling worker to stop."""
    global _worker_task, _stop_event
    _stop_event.set()
    if _worker_task:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
        _worker_task = None
