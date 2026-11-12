import { request, ApiResponse } from './api';
import { LogEntry, LogLevel, LogsListResponse } from '../types/logs';

export const logService = {
  getLogs: (params: {
    level?: LogLevel;
    service?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<LogsListResponse>> => {
    const query = new URLSearchParams();
    if (params.level) query.set('level', params.level);
    if (params.service) query.set('service', params.service);
    if (params.search) query.set('search', params.search);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));

    const endpoint = `/logs${query.toString() ? `?${query.toString()}` : ''}`;
    return request<LogsListResponse>(endpoint);
  },

  simulateLog: (level: LogLevel, service: string, message: string): Promise<ApiResponse<LogEntry>> => {
    return request<LogEntry>(
      `/logs/simulate?level=${level}&service=${encodeURIComponent(service)}&message=${encodeURIComponent(message)}`,
      { method: 'POST' }
    );
  },
};
