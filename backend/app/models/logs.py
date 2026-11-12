import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class SystemLogRecord(Base):
    """
    Log aggregator persistent storage model.
    Captures structured event streams across application services, containers, and infrastructure nodes.
    """

    __tablename__ = "system_log_records"

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
    level: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    service: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    source_ip: Mapped[str] = mapped_column(String(45), nullable=True)
    metadata_json: Mapped[str] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<SystemLogRecord id={self.id} level={self.level} service={self.service}>"
