import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class LogSourceRecord(Base):
    """
    SQLAlchemy model for configured log collection sources.
    Tracks Windows Event channels, FastAPI logger streams, Docker container logs, and application log files.
    """

    __tablename__ = "log_sources"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)  # WINDOWS_EVENT, APPLICATION_LOG, CONTAINER_LOG, FILE
    channel_or_path: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    format: Mapped[str] = mapped_column(String(32), nullable=False, default="JSON")  # JSON, WINDOWS_XML, LOGFMT, RAW_TEXT
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    tags: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    collection_status: Mapped[str] = mapped_column(String(32), nullable=False, default="HEALTHY")  # HEALTHY, DEGRADED, OFFLINE, UNAUTHORIZED
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_collected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<LogSourceRecord id={self.id} name='{self.name}' type='{self.source_type}' status='{self.collection_status}'>"
