export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'checking';

export interface LivenessResponse {
  status: HealthStatus;
  app_name: string;
  version: string;
  uptime_seconds: number;
  timestamp: string;
}

export interface PoolInfo {
  pool_size?: number;
  checked_in?: number;
  checked_out?: number;
  overflow?: number;
  [key: string]: unknown;
}

export interface DatabaseHealth {
  status: HealthStatus;
  connected: boolean;
  latency_ms: number;
  pool_info?: PoolInfo | null;
  error?: string | null;
}

export interface ReadinessResponse {
  status: HealthStatus;
  database: DatabaseHealth;
  timestamp: string;
}

export interface SystemInfoResponse {
  project_name: string;
  tagline: string;
  version: string;
  environment: string;
  debug: boolean;
  python_version: string;
  os_platform: string;
  timestamp: string;
}

export interface ConfigSummaryResponse {
  project_name: string;
  tagline: string;
  version: string;
  environment: string;
  api_v1_prefix: string;
  cors_origins: string[];
  postgres_host: string;
  postgres_port: number;
  postgres_db: string;
  db_pool_size: number;
  db_max_overflow: number;
}

export interface TelemetryHeaders {
  correlationId?: string;
  responseTimeMs?: string;
}
