import { request, ApiResponse } from './api';
import {
  AnalyticsSummaryResponse,
  BaselinesResponse,
  HistoricalMetricResponse,
  TimeRange,
} from '../types/analytics';

export const analyticsService = {
  async getCpuHistory(timeRange: TimeRange = '15m'): Promise<ApiResponse<HistoricalMetricResponse>> {
    return request<HistoricalMetricResponse>(`/analytics/cpu/history?range=${timeRange}`, { method: 'GET' }, 8000);
  },

  async getMemoryHistory(timeRange: TimeRange = '15m'): Promise<ApiResponse<HistoricalMetricResponse>> {
    return request<HistoricalMetricResponse>(`/analytics/memory/history?range=${timeRange}`, { method: 'GET' }, 8000);
  },

  async getDiskHistory(timeRange: TimeRange = '15m'): Promise<ApiResponse<HistoricalMetricResponse>> {
    return request<HistoricalMetricResponse>(`/analytics/disk/history?range=${timeRange}`, { method: 'GET' }, 8000);
  },

  async getNetworkHistory(timeRange: TimeRange = '15m'): Promise<ApiResponse<HistoricalMetricResponse>> {
    return request<HistoricalMetricResponse>(`/analytics/network/history?range=${timeRange}`, { method: 'GET' }, 8000);
  },

  async getBaselines(baselineDuration: string = '24h'): Promise<ApiResponse<BaselinesResponse>> {
    return request<BaselinesResponse>(
      `/analytics/baselines?baseline_duration=${baselineDuration}`,
      { method: 'GET' },
      8000
    );
  },

  async getSummary(): Promise<ApiResponse<AnalyticsSummaryResponse>> {
    return request<AnalyticsSummaryResponse>('/analytics/summary', { method: 'GET' }, 6000);
  },
};
