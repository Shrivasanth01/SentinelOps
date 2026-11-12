export interface CpuMetrics {
  overall_percent: number;
  per_cpu_percent: number[];
  count_physical?: number | null;
  count_logical: number;
  load_avg_1m?: number | null;
  load_avg_5m?: number | null;
  load_avg_15m?: number | null;
  ctx_switches?: number | null;
}

export interface MemoryMetrics {
  total_bytes: number;
  available_bytes: number;
  used_bytes: number;
  free_bytes: number;
  percent: number;
  swap_total_bytes: number;
  swap_used_bytes: number;
  swap_percent: number;
}

export interface DiskPartitionMetrics {
  device: string;
  mountpoint: string;
  fstype: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  percent: number;
}

export interface DiskMetrics {
  partitions: DiskPartitionMetrics[];
  read_bytes: number;
  write_bytes: number;
  read_count: number;
  write_count: number;
}

export interface NetworkInterfaceMetrics {
  interface: string;
  bytes_sent: number;
  bytes_recv: number;
  packets_sent: number;
  packets_recv: number;
  errin: number;
  errout: number;
  dropin: number;
  dropout: number;
}

export interface NetworkMetrics {
  interfaces: NetworkInterfaceMetrics[];
  total_bytes_sent: number;
  total_bytes_recv: number;
  bytes_sent_rate_per_sec: number;
  bytes_recv_rate_per_sec: number;
}

export interface SystemProcessMetrics {
  process_count: number;
  thread_count?: number | null;
  boot_time: string;
  uptime_seconds: number;
}

export interface HostMetricsSnapshot {
  timestamp: string;
  host_name: string;
  platform: string;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  system: SystemProcessMetrics;
}

export interface MetricsHistoryResponse {
  snapshots: HostMetricsSnapshot[];
  total_count: number;
  sampling_interval_seconds: number;
}

export interface MetricsSummaryResponse {
  sample_count: number;
  cpu_percent_avg: number;
  cpu_percent_max: number;
  cpu_percent_min: number;
  memory_percent_avg: number;
  memory_percent_max: number;
  memory_percent_min: number;
  disk_percent_avg: number;
  time_window_seconds: number;
}
