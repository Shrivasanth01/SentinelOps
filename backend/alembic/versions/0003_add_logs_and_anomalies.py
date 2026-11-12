"""Add system_log_records and anomaly_event_records tables

Revision ID: 0003_add_logs_and_anomalies
Revises: 0002_add_metric_snapshots
Create Date: 2026-11-12 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003_add_logs_and_anomalies"
down_revision: Union[str, None] = "0002_add_metric_snapshots"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. System Log Records
    op.create_table(
        "system_log_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("level", sa.String(length=16), nullable=False),
        sa.Column("service", sa.String(length=64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("source_ip", sa.String(length=45), nullable=True),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_system_log_records_timestamp"),
        "system_log_records",
        ["timestamp"],
        unique=False,
    )
    op.create_index(
        op.f("ix_system_log_records_level"),
        "system_log_records",
        ["level"],
        unique=False,
    )
    op.create_index(
        op.f("ix_system_log_records_service"),
        "system_log_records",
        ["service"],
        unique=False,
    )

    # 2. Anomaly Event Records
    op.create_table(
        "anomaly_event_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("is_anomaly", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("contributing_metrics", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_anomaly_event_records_timestamp"),
        "anomaly_event_records",
        ["timestamp"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_anomaly_event_records_timestamp"), table_name="anomaly_event_records")
    op.drop_table("anomaly_event_records")

    op.drop_index(op.f("ix_system_log_records_service"), table_name="system_log_records")
    op.drop_index(op.f("ix_system_log_records_level"), table_name="system_log_records")
    op.drop_index(op.f("ix_system_log_records_timestamp"), table_name="system_log_records")
    op.drop_table("system_log_records")

