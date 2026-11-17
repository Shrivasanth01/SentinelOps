import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Boolean, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AnomalyEventRecord(Base):
    """
    Persistent record of anomalies flagged by the Isolation Forest detector.
    Tracks metric deviations, severity classification, feature snapshots,
    operator investigation notes, and resolution states.
    """

    __tablename__ = "anomaly_event_records"

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
    host_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="windows-host",
        index=True,
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    raw_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    prediction: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="ANOMALOUS",
    )
    is_anomaly: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    contributing_metrics: Mapped[str] = mapped_column(Text, nullable=False)
    feature_snapshot_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    acknowledged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    acknowledged_by: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    investigation_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return f"<AnomalyEventRecord id={self.id} score={self.score} severity={self.severity} ack={self.acknowledged}>"
