import { request, ApiResponse } from './api';
import {
  LivenessResponse,
  ReadinessResponse,
  SystemInfoResponse,
  ConfigSummaryResponse,
} from '../types/health';

export const healthService = {
  getLiveness: (): Promise<ApiResponse<LivenessResponse>> => {
    return request<LivenessResponse>('/health/live');
  },

  getReadiness: (): Promise<ApiResponse<ReadinessResponse>> => {
    return request<ReadinessResponse>('/health/ready');
  },

  getSystemInfo: (): Promise<ApiResponse<SystemInfoResponse>> => {
    return request<SystemInfoResponse>('/health/info');
  },

  getConfigSummary: (): Promise<ApiResponse<ConfigSummaryResponse>> => {
    return request<ConfigSummaryResponse>('/system/config-summary');
  },
};

