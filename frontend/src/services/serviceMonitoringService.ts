import { request, ApiResponse } from './api';
import {
  MonitoredService,
  MonitoredServiceCreate,
  MonitoredServiceUpdate,
  ServicesListResponse,
  WindowsServicesResponse,
} from '../types/services';

export const serviceMonitoringService = {
  async listServices(): Promise<ApiResponse<ServicesListResponse>> {
    return request<ServicesListResponse>('/services', { method: 'GET' }, 8000);
  },

  async createService(payload: MonitoredServiceCreate): Promise<ApiResponse<MonitoredService>> {
    return request<MonitoredService>(
      '/services',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      8000
    );
  },

  async getService(serviceId: string): Promise<ApiResponse<MonitoredService>> {
    return request<MonitoredService>(`/services/${serviceId}`, { method: 'GET' }, 8000);
  },

  async updateService(
    serviceId: string,
    payload: MonitoredServiceUpdate
  ): Promise<ApiResponse<MonitoredService>> {
    return request<MonitoredService>(
      `/services/${serviceId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      5000
    );
  },

  async deleteService(serviceId: string): Promise<ApiResponse<{ deleted: boolean; id: string }>> {
    return request<{ deleted: boolean; id: string }>(
      `/services/${serviceId}`,
      { method: 'DELETE' },
      5000
    );
  },

  async getWindowsServices(services?: string[]): Promise<ApiResponse<WindowsServicesResponse>> {
    const query = services && services.length > 0 ? `?services=${services.join(',')}` : '';
    return request<WindowsServicesResponse>(`/services/windows/overview${query}`, { method: 'GET' }, 6000);
  },
};
