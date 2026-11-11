import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Boolean, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class HealthCheckAuditLog(Base):
    """
    Audit log table for recorded platform health probes and system heartbeats.
    Serves as the foundation table verifying database migrations and connectivity.
    """

    __tablename__ = "health_check_audit_logs"

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
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="HEALTHY")
    db_connected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    db_latency_ms: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    details: Mapped[str] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<HealthCheckAuditLog id={self.id} status={self.status} db_connected={self.db_connected}>"

