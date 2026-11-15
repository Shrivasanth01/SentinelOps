"""Add monitored_services table for Phase 3 service availability monitoring

Revision ID: 0004_add_monitored_services
Revises: 0003_add_logs_and_anomalies
Create Date: 2026-11-15 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004_add_monitored_services"
down_revision: Union[str, None] = "0003_add_logs_and_anomalies"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "monitored_services",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("target_url", sa.String(length=512), nullable=False),
        sa.Column("protocol", sa.String(length=16), nullable=False, server_default="HTTP"),
        sa.Column("probe_module", sa.String(length=32), nullable=False, server_default="http_2xx"),
        sa.Column("expected_status_code", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("probe_interval_seconds", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("timeout_seconds", sa.Float(), nullable=False, server_default="5.0"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tags", sa.String(length=256), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_monitored_services_name", "monitored_services", ["name"])


def downgrade() -> None:
    op.drop_index("ix_monitored_services_name", table_name="monitored_services")
    op.drop_table("monitored_services")
