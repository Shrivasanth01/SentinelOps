import { request, ApiResponse } from './api';
import { TopologyResponse } from '../types/topology';

export const topologyService = {
  async getTopology(): Promise<ApiResponse<TopologyResponse>> {
    return request<TopologyResponse>('/topology', { method: 'GET' }, 8000);
  },
};

