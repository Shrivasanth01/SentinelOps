import { request, ApiResponse } from './api';
import {
  CpuMetricData,
  DiskMetricData,
  HistoryMetricsResponse,
  MemoryMetricData,
  MonitoringOverviewResponse,
  NetworkMetricData,
  SystemInfoData,
  TargetsResponse,
} from '../types/monitoring';

export const monitoringService = {
  getOverview: (): Promise<ApiResponse<MonitoringOverviewResponse>> => {
    return request<MonitoringOverviewResponse>('/monitoring/overview', {}, 8000);
  },

  getCpu: (): Promise<ApiResponse<CpuMetricData>> => {
    return request<CpuMetricData>('/monitoring/cpu', {}, 5000);
  },

  getMemory: (): Promise<ApiResponse<MemoryMetricData>> => {
    return request<MemoryMetricData>('/monitoring/memory', {}, 5000);
  },

  getDisk: (): Promise<ApiResponse<DiskMetricData>> => {
    return request<DiskMetricData>('/monitoring/disk', {}, 5000);
  },

  getNetwork: (): Promise<ApiResponse<NetworkMetricData>> => {
    return request<NetworkMetricData>('/monitoring/network', {}, 5000);
  },

  getSystem: (): Promise<ApiResponse<SystemInfoData>> => {
    return request<SystemInfoData>('/monitoring/system', {}, 5000);
  },

  getTargets: (): Promise<ApiResponse<TargetsResponse>> => {
    return request<TargetsResponse>('/monitoring/targets', {}, 5000);
  },

  getHistory: (
    metrics: string[] = ['cpu', 'memory', 'disk', 'network'],
    duration: string = '15m',
    step: string = '15s'
  ): Promise<ApiResponse<HistoryMetricsResponse>> => {
    const params = new URLSearchParams();
    metrics.forEach((m) => params.append('metrics', m));
    params.set('duration', duration);
    params.set('step', step);
    return request<HistoryMetricsResponse>(`/monitoring/history?${params.toString()}`, {}, 10000);
  },
};
