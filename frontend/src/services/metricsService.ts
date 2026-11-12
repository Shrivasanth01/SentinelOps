import { request, ApiResponse } from './api';
import {
  HostMetricsSnapshot,
  MetricsHistoryResponse,
  MetricsSummaryResponse,
} from '../types/metrics';

export const metricsService = {
  getCurrent: (): Promise<ApiResponse<HostMetricsSnapshot>> => {
    return request<HostMetricsSnapshot>('/metrics/current');
  },

  getHistory: (limit: number = 60): Promise<ApiResponse<MetricsHistoryResponse>> => {
    return request<MetricsHistoryResponse>(`/metrics/history?limit=${limit}`);
  },

  getSummary: (windowSeconds: number = 300): Promise<ApiResponse<MetricsSummaryResponse>> => {
    return request<MetricsSummaryResponse>(`/metrics/summary?window_seconds=${windowSeconds}`);
  },
};

