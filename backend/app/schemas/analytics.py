from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class TimeRangeEnum(str, Enum):
    LAST_15M = "15m"
    LAST_1H = "1h"
    LAST_6H = "6h"
    LAST_24H = "24h"
    LAST_7D = "7d"


class TrendDirectionEnum(str, Enum):
    INCREASING = "INCREASING"
    DECREASING = "DECREASING"
    STABLE = "STABLE"
    SURGING = "SURGING"
    QUIET = "QUIET"


class DeviationStatusEnum(str, Enum):
    NOMINAL = "NOMINAL"
    WARNING_DEVIATION = "WARNING_DEVIATION"
    CRITICAL_DEVIATION = "CRITICAL_DEVIATION"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class SubsystemStats(BaseModel):
    mean: Optional[float] = Field(default=None, description="Statistical historical arithmetic mean")
    median: Optional[float] = Field(default=None, description="Statistical historical median")
    min: Optional[float] = Field(default=None, description="Minimum observed historical value")
    max: Optional[float] = Field(default=None, description="Maximum observed historical value")
    standard_deviation: Optional[float] = Field(default=None, description="Sample standard deviation (sigma)")
    rolling_average: Optional[float] = Field(default=None, description="Moving window rolling average")
    current_value: Optional[float] = Field(default=None, description="Most recent live metric value")
    trend: TrendDirectionEnum = Field(default=TrendDirectionEnum.STABLE, description="Calculated trajectory")
    rate_of_change_percent: Optional[float] = Field(default=None, description="Percentage change across window")
    sample_count: int = Field(default=0, description="Number of valid metric samples analyzed")
    has_sufficient_data: bool = Field(default=True, description="Whether minimum sample criteria is satisfied")
    data_quality_notes: Optional[str] = Field(default=None, description="Notes on data gaps or sparsity")


class HistoricalMetricPoint(BaseModel):
    timestamp: float = Field(..., description="Unix epoch seconds")
    value: Optional[float] = Field(default=None, description="Sampled value")


class HistoricalMetricResponse(BaseModel):
    subsystem: str = Field(..., description="Target telemetry subsystem (cpu, memory, disk, network)")
    time_range: str = Field(..., description="Selected time range window")
    start_time: float = Field(..., description="Range start unix epoch seconds")
    end_time: float = Field(..., description="Range end unix epoch seconds")
    step: str = Field(..., description="PromQL query step resolution")
    unit: str = Field(default="", description="Metric unit symbol (%, B/s, bytes)")
    stats: SubsystemStats
    points: list[HistoricalMetricPoint] = Field(default_factory=list)
    breakdown: dict[str, list[HistoricalMetricPoint]] = Field(
        default_factory=dict,
        description="Detailed multi-series breakdown (e.g. per-core, used/free, rx/tx)",
    )


class StatisticalBaseline(BaseModel):
    metric_key: str = Field(..., description="Metric identifier key")
    metric_label: str = Field(..., description="Human-readable metric name")
    unit: str = Field(default="", description="Metric unit symbol")
    historical_mean: Optional[float] = None
    historical_median: Optional[float] = None
    historical_stddev: Optional[float] = None
    historical_min: Optional[float] = None
    historical_max: Optional[float] = None
    rolling_average: Optional[float] = None
    current_value: Optional[float] = None
    z_score: Optional[float] = Field(default=None, description="Standard deviations from mean: (x - mean)/stddev")
    delta_percent: Optional[float] = Field(default=None, description="Percentage delta relative to baseline mean")
    deviation_status: DeviationStatusEnum = Field(default=DeviationStatusEnum.NOMINAL)
    sample_count: int = 0
    has_sufficient_data: bool = True
    deviation_message: Optional[str] = None


class BaselinesResponse(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    baselines: list[StatisticalBaseline] = Field(default_factory=list)
    total_metrics: int = 0
    deviations_detected: int = 0
    sufficient_data_count: int = 0


class AnalyticsSummaryResponse(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    overall_stability_score: float = Field(..., ge=0.0, le=100.0, description="Overall health score (0-100%)")
    system_status: str = Field(..., description="High-level health category (HEALTHY, ELEVATED, DEGRADED)")
    subsystems: dict[str, SubsystemStats] = Field(default_factory=dict)
    critical_trends: list[str] = Field(default_factory=list, description="List of notable growth or surge trends")
    service_availability_percent: float = Field(default=100.0, ge=0.0, le=100.0)
    monitored_nodes_count: int = 0
