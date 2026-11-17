"""Add ml_model_records table and enhance anomaly_event_records for Phase 5

Revision ID: 0006_add_ml_model_registry_and_enhance_anomalies
Revises: 0005_add_log_sources
Create Date: 2026-11-17 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0006_add_ml_model_registry_and_enhance_anomalies"
down_revision: Union[str, None] = "0005_add_log_sources"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create ml_model_records table
    op.create_table(
        "ml_model_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("version", sa.String(length=64), nullable=False),
        sa.Column("model_type", sa.String(length=32), nullable=False, server_default="IsolationForest"),
        sa.Column("file_path", sa.String(length=256), nullable=False),
        sa.Column("n_estimators", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("contamination", sa.Float(), nullable=False, server_default="0.05"),
        sa.Column("random_state", sa.Integer(), nullable=False, server_default="42"),
        sa.Column("features_json", sa.Text(), nullable=False),
        sa.Column("training_sample_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("training_time_range_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("training_time_range_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("training_duration_seconds", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("evaluation_metrics_json", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="CANDIDATE"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ml_model_records_version"), "ml_model_records", ["version"], unique=True)
    op.create_index(op.f("ix_ml_model_records_is_active"), "ml_model_records", ["is_active"], unique=False)

    # 2. Add columns to anomaly_event_records
    op.add_column("anomaly_event_records", sa.Column("host_id", sa.String(length=64), nullable=False, server_default="windows-host"))
    op.add_column("anomaly_event_records", sa.Column("raw_score", sa.Float(), nullable=False, server_default="0.0"))
    op.add_column("anomaly_event_records", sa.Column("prediction", sa.String(length=16), nullable=False, server_default="ANOMALOUS"))
    op.add_column("anomaly_event_records", sa.Column("feature_snapshot_json", sa.Text(), nullable=True))
    op.add_column("anomaly_event_records", sa.Column("model_version", sa.String(length=64), nullable=True))
    op.add_column("anomaly_event_records", sa.Column("acknowledged", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("anomaly_event_records", sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("anomaly_event_records", sa.Column("acknowledged_by", sa.String(length=64), nullable=True))
    op.add_column("anomaly_event_records", sa.Column("investigation_notes", sa.Text(), nullable=True))

    op.create_index(op.f("ix_anomaly_event_records_host_id"), "anomaly_event_records", ["host_id"], unique=False)
    op.create_index(op.f("ix_anomaly_event_records_acknowledged"), "anomaly_event_records", ["acknowledged"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_anomaly_event_records_acknowledged"), table_name="anomaly_event_records")
    op.drop_index(op.f("ix_anomaly_event_records_host_id"), table_name="anomaly_event_records")

    op.drop_column("anomaly_event_records", "investigation_notes")
    op.drop_column("anomaly_event_records", "acknowledged_by")
    op.drop_column("anomaly_event_records", "acknowledged_at")
    op.drop_column("anomaly_event_records", "acknowledged")
    op.drop_column("anomaly_event_records", "model_version")
    op.drop_column("anomaly_event_records", "feature_snapshot_json")
    op.drop_column("anomaly_event_records", "prediction")
    op.drop_column("anomaly_event_records", "raw_score")
    op.drop_column("anomaly_event_records", "host_id")

    op.drop_index(op.f("ix_ml_model_records_is_active"), table_name="ml_model_records")
    op.drop_index(op.f("ix_ml_model_records_version"), table_name="ml_model_records")
    op.drop_table("ml_model_records")
