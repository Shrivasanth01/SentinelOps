"""Add log_sources table for Phase 4 centralized log management

Revision ID: 0005_add_log_sources
Revises: 0004_add_monitored_services
Create Date: 2026-11-15 10:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005_add_log_sources"
down_revision: Union[str, None] = "0004_add_monitored_services"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "log_sources",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("channel_or_path", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("format", sa.String(length=32), nullable=False, server_default="JSON"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("tags", sa.String(length=256), nullable=True),
        sa.Column("collection_status", sa.String(length=32), nullable=False, server_default="HEALTHY"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("last_collected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_log_sources_name", "log_sources", ["name"])
    op.create_index("ix_log_sources_source_type", "log_sources", ["source_type"])


def downgrade() -> None:
    op.drop_index("ix_log_sources_source_type", table_name="log_sources")
    op.drop_index("ix_log_sources_name", table_name="log_sources")
    op.drop_table("log_sources")
