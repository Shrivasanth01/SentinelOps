"""Initial schema migration: health_check_audit_logs

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-11 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "health_check_audit_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("db_connected", sa.Boolean(), nullable=False),
        sa.Column("db_latency_ms", sa.Float(), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_health_check_audit_logs_timestamp"),
        "health_check_audit_logs",
        ["timestamp"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_health_check_audit_logs_timestamp"),
        table_name="health_check_audit_logs",
    )
    op.drop_table("health_check_audit_logs")

