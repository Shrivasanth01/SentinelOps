export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'UNKNOWN';

export type LogSourceType = 'WINDOWS_EVENT' | 'APPLICATION_LOG' | 'CONTAINER_LOG' | 'FILE';

export type LogFormat = 'JSON' | 'WINDOWS_XML' | 'LOGFMT' | 'RAW_TEXT';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  source?: string;
  channel_or_file?: string | null;
  event_id?: number | null;
  provider?: string | null;
  computer?: string | null;
  correlation_id?: string | null;
  metadata?: Record<string, unknown> | null;
  raw?: string | null;
  source_ip?: string | null;
}

export interface LogsListResponse {
  logs: LogEntry[];
  total_count: number;
  limit: number;
  offset: number;
}

export interface LogSearchResult {
  logs: LogEntry[];
  total: number;
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  query_used: string;
  time_range?: string | null;
  execution_time_ms: number;
  loki_connected: boolean;
}

export interface LogSummaryResponse {
  total_logs: number;
  level_distribution: Record<string, number>;
  service_distribution: Record<string, number>;
  recent_error_rate: number;
  collection_health: string;
}

export interface ErrorGroup {
  fingerprint: string;
  pattern: string;
  count: number;
  level: LogLevel;
  service: string;
  first_seen: string;
  last_seen: string;
  sample_message: string;
}

export interface ErrorIntelligenceResponse {
  total_errors: number;
  unique_patterns: number;
  groups: ErrorGroup[];
}

export interface TimelineBucket {
  timestamp: number;
  time_label: string;
  count: number;
  level_breakdown: Record<string, number>;
}

export interface LogTimelineResponse {
  buckets: TimelineBucket[];
  start_time: number;
  end_time: number;
  bucket_size_seconds: number;
  total_events: number;
}

export interface LogSource {
  id: string;
  name: string;
  source_type: LogSourceType;
  channel_or_path: string;
  description?: string | null;
  format: LogFormat;
  enabled: boolean;
  tags?: string | null;
  collection_status: string;
  error_message?: string | null;
  last_collected_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogSourcesListResponse {
  sources: LogSource[];
  total: number;
  active_count: number;
}

export interface LogSourceCreate {
  name: string;
  source_type: LogSourceType;
  channel_or_path: string;
  description?: string;
  format?: LogFormat;
  enabled?: boolean;
  tags?: string;
}

export interface LogCorrelationResponse {
  metric_name: string;
  metric_event_timestamp: number;
  window_seconds: number;
  start_time: number;
  end_time: number;
  logs: LogEntry[];
  correlated_count: number;
  error_count: number;
  warning_count: number;
  disclaimer: string;
}

export interface LogHealthResponse {
  loki_status: string;
  loki_url: string;
  loki_latency_ms?: number | null;
  sources_configured: number;
  sources_healthy: number;
  ingestion_active: boolean;
  redaction_enabled: boolean;
}
