import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, BigInteger, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class MetricSnapshotRecord(Base):
    """
    Time-series metric snapshot table capturing host telemetry state.
    Provides persistent historical metrics for trend analysis, SLA reporting, and baseline modeling.
    """

    __tablename__ = "metric_snapshot_records"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
    cpu_percent: Mapped[float] = mapped_column(Float, nullable=False)
    memory_percent: Mapped[float] = mapped_column(Float, nullable=False)
    disk_percent: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    network_sent_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    network_recv_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    process_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    payload_json: Mapped[str] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<MetricSnapshotRecord id={self.id} ts={self.timestamp} cpu={self.cpu_percent}% mem={self.memory_percent}%>"

