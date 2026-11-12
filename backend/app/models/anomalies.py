import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Boolean, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AnomalyEventRecord(Base):
    """
    Persistent record of anomalies flagged by the Isolation Forest detector.
    Tracks metric deviations, severity classification, and operational resolution states.
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
    score: Mapped[float] = mapped_column(Float, nullable=False)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    contributing_metrics: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return f"<AnomalyEventRecord id={self.id} score={self.score} severity={self.severity}>"
