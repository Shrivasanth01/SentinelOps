export type TimeRange = '15m' | '1h' | '6h' | '24h' | '7d';

export type TrendDirection =
  | 'INCREASING'
  | 'DECREASING'
  | 'STABLE'
  | 'SURGING'
  | 'QUIET';

export type DeviationStatus =
  | 'NOMINAL'
  | 'WARNING_DEVIATION'
  | 'CRITICAL_DEVIATION'
  | 'INSUFFICIENT_DATA';

export interface SubsystemStats {
  mean?: number | null;
  median?: number | null;
  min?: number | null;
  max?: number | null;
  standard_deviation?: number | null;
  rolling_average?: number | null;
  current_value?: number | null;
  trend: TrendDirection;
  rate_of_change_percent?: number | null;
  sample_count: number;
  has_sufficient_data: boolean;
  data_quality_notes?: string | null;
}

export interface HistoricalMetricPoint {
  timestamp: number; // Unix epoch seconds
  value?: number | null;
}

export interface HistoricalMetricResponse {
  subsystem: string; // cpu, memory, disk, network
  time_range: string;
  start_time: number;
  end_time: number;
  step: string;
  unit: string;
  stats: SubsystemStats;
  points: HistoricalMetricPoint[];
  breakdown: Record<string, HistoricalMetricPoint[]>;
}

export interface StatisticalBaseline {
  metric_key: string;
  metric_label: string;
  unit: string;
  historical_mean?: number | null;
  historical_median?: number | null;
  historical_stddev?: number | null;
  historical_min?: number | null;
  historical_max?: number | null;
  rolling_average?: number | null;
  current_value?: number | null;
  z_score?: number | null;
  delta_percent?: number | null;
  deviation_status: DeviationStatus;
  sample_count: number;
  has_sufficient_data: boolean;
  deviation_message?: string | null;
}

export interface BaselinesResponse {
  timestamp: string;
  baselines: StatisticalBaseline[];
  total_metrics: number;
  deviations_detected: number;
  sufficient_data_count: number;
}

export interface AnalyticsSummaryResponse {
  timestamp: string;
  overall_stability_score: number; // 0 - 100
  system_status: string; // HEALTHY, ELEVATED, DEGRADED
  subsystems: Record<string, SubsystemStats>;
  critical_trends: string[];
  service_availability_percent: number;
  monitored_nodes_count: number;
}
