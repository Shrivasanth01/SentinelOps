export type ProtocolType = 'HTTP' | 'HTTPS' | 'TCP';
export type ProbeModuleType = 'http_2xx' | 'http_post_2xx' | 'tcp_connect' | 'tls_connect';
export type ServiceAvailabilityStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN';

export interface MonitoredService {
  id: string;
  name: string;
  target_url: string;
  protocol: ProtocolType;
  probe_module: ProbeModuleType;
  expected_status_code: number;
  probe_interval_seconds: number;
  timeout_seconds: number;
  enabled: boolean;
  description?: string | null;
  tags?: string | null;
  created_at: string;
  updated_at: string;

  // Live Probing Diagnostics
  availability_status: ServiceAvailabilityStatus;
  response_time_ms?: number | null;
  http_status_code?: number | null;
  probe_duration_ms?: number | null;
  tls_cert_expiry_days?: number | null;
  last_successful_check?: string | null;
  last_error?: string | null;
}

export interface MonitoredServiceCreate {
  name: string;
  target_url: string;
  protocol?: ProtocolType;
  probe_module?: ProbeModuleType;
  expected_status_code?: number;
  probe_interval_seconds?: number;
  timeout_seconds?: number;
  enabled?: boolean;
  description?: string;
  tags?: string;
}

export interface MonitoredServiceUpdate {
  name?: string;
  target_url?: string;
  protocol?: ProtocolType;
  probe_module?: ProbeModuleType;
  expected_status_code?: number;
  probe_interval_seconds?: number;
  timeout_seconds?: number;
  enabled?: boolean;
  description?: string;
  tags?: string;
}

export interface ServicesListResponse {
  total: number;
  active_count: number;
  up_count: number;
  down_count: number;
  services: MonitoredService[];
}

export interface WindowsServiceInfo {
  name: string;
  display_name: string;
  state: string; // running, stopped, start_pending, etc.
  start_mode: string; // auto, manual, disabled
  is_healthy: boolean;
  run_as?: string | null;
  last_observed: string;
}

export interface WindowsServicesResponse {
  services: WindowsServiceInfo[];
  collector_enabled: boolean;
  total_services_monitored: number;
  running_count: number;
  stopped_count: number;
}
