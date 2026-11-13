export type HealthState = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
export type TargetHealth = 'UP' | 'DOWN' | 'UNKNOWN';

export interface TargetStatus {
  name: string;
  url: string;
  health: TargetHealth;
  last_scraped_at: string | null;
  last_error: string | null;
  scrape_duration_ms: number | null;
  labels: Record<string, string>;
}

export interface TargetsResponse {
  status: string;
  total_targets: number;
  up_targets: number;
  targets: TargetStatus[];
}

export interface CpuMetricData {
  overall_percent: number | null;
  core_count: number | null;
  cores: number[];
  user_percent: number | null;
  system_percent: number | null;
  idle_percent: number | null;
  interrupt_percent: number | null;
  dpc_percent: number | null;
  status: HealthState;
  timestamp: string;
}

export interface MemoryMetricData {
  total_bytes: number | null;
  used_bytes: number | null;
  free_bytes: number | null;
  percent: number | null;
  commit_limit_bytes: number | null;
  commit_total_bytes: number | null;
  status: HealthState;
  timestamp: string;
}

export interface DiskVolumeData {
  volume: string;
  total_bytes: number | null;
  used_bytes: number | null;
  free_bytes: number | null;
  percent: number | null;
  status: HealthState;
}

export interface DiskMetricData {
  volumes: DiskVolumeData[];
  total_read_bytes_per_sec: number | null;
  total_write_bytes_per_sec: number | null;
  status: HealthState;
  timestamp: string;
}

export interface NetworkInterfaceData {
  interface: string;
  rx_bytes_per_sec: number | null;
  tx_bytes_per_sec: number | null;
}

export interface NetworkMetricData {
  rx_bytes_per_sec: number | null;
  tx_bytes_per_sec: number | null;
  interfaces: NetworkInterfaceData[];
  status: HealthState;
  timestamp: string;
}

export interface SystemInfoData {
  hostname: string | null;
  os_name: string | null;
  os_version: string | null;
  os_build: string | null;
  uptime_seconds: number | null;
  boot_time: string | null;
  process_count: number | null;
  timestamp: string;
}

export interface InfrastructureHealthData {
  state: HealthState;
  summary: string;
  reasons: string[];
  target_status: TargetHealth;
  prometheus_connected: boolean;
  last_checked_at: string;
}

export interface MonitoringOverviewResponse {
  timestamp: string;
  health: InfrastructureHealthData;
  cpu: CpuMetricData;
  memory: MemoryMetricData;
  disk: DiskMetricData;
  network: NetworkMetricData;
  system: SystemInfoData;
  targets: TargetStatus[];
}

export interface HistoryPoint {
  timestamp: number;
  value: number | null;
}

export interface HistorySeries {
  metric: string;
  label: string;
  unit: string;
  points: HistoryPoint[];
}

export interface HistoryMetricsResponse {
  series: HistorySeries[];
  start: number;
  end: number;
  step: string;
}
