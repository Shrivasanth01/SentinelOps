import { request, ApiResponse } from './api';
import {
  AnomalyScoreResponse,
  AnomalyHistoryResponse,
  ModelTrainResponse,
  AnomalyEvent,
  AnomalySeverity,
} from '../types/anomalies';

export const anomalyService = {
  getScore: (): Promise<ApiResponse<AnomalyScoreResponse>> => {
    return request<AnomalyScoreResponse>('/anomalies/score');
  },

  getRecent: (limit: number = 20): Promise<ApiResponse<AnomalyHistoryResponse>> => {
    return request<AnomalyHistoryResponse>(`/anomalies/recent?limit=${limit}`);
  },

  retrainModel: (): Promise<ApiResponse<ModelTrainResponse>> => {
    return request<ModelTrainResponse>('/anomalies/retrain', { method: 'POST' });
  },

  simulateAnomaly: (severity: AnomalySeverity, metric: string): Promise<ApiResponse<AnomalyEvent>> => {
    return request<AnomalyEvent>(
      `/anomalies/simulate?severity=${severity}&metric=${encodeURIComponent(metric)}`,
      { method: 'POST' }
    );
  },
};

