import { request, ApiResponse } from './api';
import {
  ErrorIntelligenceResponse,
  LogCorrelationResponse,
  LogHealthResponse,
  LogLevel,
  LogSearchResult,
  LogSource,
  LogSourceCreate,
  LogSourcesListResponse,
  LogSummaryResponse,
  LogTimelineResponse,
} from '../types/logs';

export interface LogQueryParams {
  level?: LogLevel;
  service?: string;
  source?: string;
  search?: string;
  timeRange?: string;
  limit?: number;
  offset?: number;
}

export interface LogCorrelationParams {
  metricName: string;
  timestamp: number;
  windowSeconds?: number;
  level?: LogLevel;
  service?: string;
}

export const logEngineService = {
  /**
   * Query structured logs with filtering, time range and pagination.
   */
  async queryLogs(params: LogQueryParams = {}): Promise<ApiResponse<LogSearchResult>> {
    const q = new URLSearchParams();
    if (params.level && params.level !== 'UNKNOWN') q.append('level', params.level);
    if (params.service) q.append('service', params.service);
    if (params.source) q.append('source', params.source);
    if (params.search) q.append('search', params.search);
    if (params.timeRange) q.append('time_range', params.timeRange);
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.offset !== undefined) q.append('offset', params.offset.toString());

    const endpoint = `/logs?${q.toString()}`;
    return request<LogSearchResult>(endpoint, { method: 'GET' }, 8000);
  },

  /**
   * Search logs using LogQL stream or free-text query.
   */
  async searchLogs(searchTerm: string, params: Omit<LogQueryParams, 'search'> = {}): Promise<ApiResponse<LogSearchResult>> {
    const q = new URLSearchParams();
    q.append('q', searchTerm);
    if (params.level && params.level !== 'UNKNOWN') q.append('level', params.level);
    if (params.service) q.append('service', params.service);
    if (params.timeRange) q.append('time_range', params.timeRange);
    if (params.limit) q.append('limit', params.limit.toString());
    if (params.offset !== undefined) q.append('offset', params.offset.toString());

    const endpoint = `/logs/search?${q.toString()}`;
    return request<LogSearchResult>(endpoint, { method: 'GET' }, 8000);
  },

  /**
   * Get log volume and severity distribution summary.
   */
  async getSummary(timeRange: string = '1h'): Promise<ApiResponse<LogSummaryResponse>> {
    return request<LogSummaryResponse>(`/logs/summary?time_range=${encodeURIComponent(timeRange)}`, { method: 'GET' }, 6000);
  },

  /**
   * Get grouped error intelligence patterns and frequencies.
   */
  async getErrorIntelligence(timeRange: string = '1h'): Promise<ApiResponse<ErrorIntelligenceResponse>> {
    return request<ErrorIntelligenceResponse>(`/logs/errors?time_range=${encodeURIComponent(timeRange)}`, { method: 'GET' }, 6000);
  },

  /**
   * Get chronological log histogram timeline buckets.
   */
  async getTimeline(timeRange: string = '1h', buckets: number = 24): Promise<ApiResponse<LogTimelineResponse>> {
    return request<LogTimelineResponse>(`/logs/timeline?time_range=${encodeURIComponent(timeRange)}&buckets=${buckets}`, { method: 'GET' }, 6000);
  },

  /**
   * Probe Loki connectivity, buffer count and collector health.
   */
  async getHealth(): Promise<ApiResponse<LogHealthResponse>> {
    return request<LogHealthResponse>('/logs/health', { method: 'GET' }, 5000);
  },

  /**
   * Correlate metric anomaly timestamp with logs in surrounding time window.
   */
  async correlateMetric(params: LogCorrelationParams): Promise<ApiResponse<LogCorrelationResponse>> {
    const q = new URLSearchParams();
    q.append('metric_name', params.metricName);
    q.append('timestamp', params.timestamp.toString());
    if (params.windowSeconds) q.append('window_seconds', params.windowSeconds.toString());
    if (params.level) q.append('level', params.level);
    if (params.service) q.append('service', params.service);

    return request<LogCorrelationResponse>(`/logs/correlate?${q.toString()}`, { method: 'GET' }, 8000);
  },

  /**
   * List configured log sources.
   */
  async listSources(): Promise<ApiResponse<LogSourcesListResponse>> {
    return request<LogSourcesListResponse>('/logs/sources', { method: 'GET' }, 6000);
  },

  /**
   * Register a new log collection source.
   */
  async createSource(source: LogSourceCreate): Promise<ApiResponse<LogSource>> {
    return request<LogSource>('/logs/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    }, 6000);
  },

  /**
   * Patch log source configuration.
   */
  async updateSource(id: string, updates: Partial<LogSourceCreate>): Promise<ApiResponse<LogSource>> {
    return request<LogSource>(`/logs/sources/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }, 6000);
  },

  /**
   * Delete a registered log source.
   */
  async deleteSource(id: string): Promise<ApiResponse<null>> {
    return request<null>(`/logs/sources/${encodeURIComponent(id)}`, { method: 'DELETE' }, 6000);
  },
};

