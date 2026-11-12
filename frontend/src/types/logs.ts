export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  source_ip?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface LogsListResponse {
  logs: LogEntry[];
  total_count: number;
  limit: number;
  offset: number;
}
