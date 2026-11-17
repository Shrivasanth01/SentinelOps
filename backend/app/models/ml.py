import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Boolean, Text, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class MLModelRecord(Base):
    """
    Persistent model registry record tracking versioned Isolation Forest models,
    training metrics, feature schemas, and activation states.
    """

    __tablename__ = "ml_model_records"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    version: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    model_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="IsolationForest",
    )
    file_path: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
    )
    n_estimators: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=100,
    )
    contamination: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.05,
    )
    random_state: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=42,
    )
    features_json: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    training_sample_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    training_time_range_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    training_time_range_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    training_duration_seconds: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    evaluation_metrics_json: Mapped[str] = mapped_column(
        Text,
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="CANDIDATE",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<MLModelRecord version={self.version} active={self.is_active} status={self.status}>"
