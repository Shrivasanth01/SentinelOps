"""Add metric_snapshot_records table

Revision ID: 0002_add_metric_snapshots
Revises: 0001_initial_schema
Create Date: 2026-11-12 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002_add_metric_snapshots"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "metric_snapshot_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cpu_percent", sa.Float(), nullable=False),
        sa.Column("memory_percent", sa.Float(), nullable=False),
        sa.Column("disk_percent", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("network_sent_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("network_recv_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("process_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_metric_snapshot_records_timestamp"),
        "metric_snapshot_records",
        ["timestamp"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_metric_snapshot_records_timestamp"),
        table_name="metric_snapshot_records",
    )
    op.drop_table("metric_snapshot_records")
