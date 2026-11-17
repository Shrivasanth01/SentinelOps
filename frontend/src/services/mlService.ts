import { request, ApiResponse } from './api';
import {
  MLStatusResponse,
  FeatureSchemaResponse,
  ModelListResponse,
  ModelMetadata,
  ModelTrainRequest,
  ModelTrainResponse,
  ModelEvaluationResponse,
  AnomalyDetectionRequest,
  AnomalyDetectionResponse,
  AnomalyEvent,
  AnomalySummaryResponse,
  AnomalyTimelineResponse,
  AnomalyAcknowledgeRequest,
} from '../types/ml';

export const mlService = {
  getStatus: (): Promise<ApiResponse<MLStatusResponse>> => {
    return request<MLStatusResponse>('/ml/status');
  },

  getFeaturesSchema: (): Promise<ApiResponse<FeatureSchemaResponse>> => {
    return request<FeatureSchemaResponse>('/ml/features');
  },

  listModels: (): Promise<ApiResponse<ModelListResponse>> => {
    return request<ModelListResponse>('/ml/models');
  },

  getModel: (modelId: string): Promise<ApiResponse<ModelMetadata>> => {
    return request<ModelMetadata>(`/ml/models/${encodeURIComponent(modelId)}`);
  },

  trainModel: (payload: ModelTrainRequest): Promise<ApiResponse<ModelTrainResponse>> => {
    return request<ModelTrainResponse>('/ml/models/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 60000); // 60s timeout for model training
  },

  evaluateModel: (modelId: string, timeRange: string = '1h'): Promise<ApiResponse<ModelEvaluationResponse>> => {
    return request<ModelEvaluationResponse>(
      `/ml/models/${encodeURIComponent(modelId)}/evaluate?time_range=${encodeURIComponent(timeRange)}`,
      { method: 'POST' },
      30000
    );
  },

  activateModel: (modelId: string): Promise<ApiResponse<ModelMetadata>> => {
    return request<ModelMetadata>(`/ml/models/${encodeURIComponent(modelId)}/activate`, {
      method: 'POST',
    });
  },

  detectAnomaly: (payload: AnomalyDetectionRequest = {}): Promise<ApiResponse<AnomalyDetectionResponse>> => {
    return request<AnomalyDetectionResponse>('/ml/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  listAnomalies: (params: {
    limit?: number;
    hours?: number;
    acknowledged?: boolean;
    hostId?: string;
  } = {}): Promise<ApiResponse<AnomalyEvent[]>> => {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.hours !== undefined) query.set('hours', String(params.hours));
    if (params.acknowledged !== undefined) query.set('acknowledged', String(params.acknowledged));
    if (params.hostId) query.set('host_id', params.hostId);

    const qs = query.toString();
    return request<AnomalyEvent[]>(`/ml/anomalies${qs ? `?${qs}` : ''}`);
  },

  getSummary: (hours: number = 24): Promise<ApiResponse<AnomalySummaryResponse>> => {
    return request<AnomalySummaryResponse>(`/ml/anomalies/summary?hours=${hours}`);
  },

  getTimeline: (hours: number = 24, bucketSeconds: number = 300): Promise<ApiResponse<AnomalyTimelineResponse>> => {
    return request<AnomalyTimelineResponse>(
      `/ml/anomalies/timeline?hours=${hours}&bucket_seconds=${bucketSeconds}`
    );
  },

  getAnomaly: (id: string): Promise<ApiResponse<AnomalyEvent>> => {
    return request<AnomalyEvent>(`/ml/anomalies/${encodeURIComponent(id)}`);
  },

  acknowledgeAnomaly: (
    id: string,
    payload: AnomalyAcknowledgeRequest
  ): Promise<ApiResponse<AnomalyEvent>> => {
    return request<AnomalyEvent>(`/ml/anomalies/${encodeURIComponent(id)}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
};
