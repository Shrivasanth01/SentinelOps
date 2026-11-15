import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class MonitoredServiceRecord(Base):
    """
    SQLAlchemy model for user-configured service availability targets.
    Persists target URL, probe protocols, expected response criteria, and scheduling parameters.
    """

    __tablename__ = "monitored_services"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    target_url: Mapped[str] = mapped_column(String(512), nullable=False)
    protocol: Mapped[str] = mapped_column(String(16), nullable=False, default="HTTP")  # HTTP, HTTPS, TCP
    probe_module: Mapped[str] = mapped_column(String(32), nullable=False, default="http_2xx")
    expected_status_code: Mapped[int] = mapped_column(Integer, nullable=False, default=200)
    probe_interval_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    timeout_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=5.0)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)  # Comma-separated tags
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
        return f"<MonitoredServiceRecord id={self.id} name='{self.name}' target='{self.target_url}' enabled={self.enabled}>"

