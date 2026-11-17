export type PredictionEnum = 'NORMAL' | 'ANOMALOUS' | 'UNKNOWN';

export type AnomalySeverityEnum = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ModelStatusEnum = 'CANDIDATE' | 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED' | 'FAILED';

export interface ModelMetadata {
  id: string;
  version: string;
  file_path: string;
  contamination: number;
  n_estimators: number;
  random_state: number;
  training_sample_count: number;
  status: ModelStatusEnum;
  is_active: boolean;
  feature_names: string[];
  created_at: string;
  notes?: string;
  evaluation_summary?: Record<string, any>;
}

export interface ModelListResponse {
  models: ModelMetadata[];
  total: number;
  active_version?: string;
}

export interface ModelTrainRequest {
  time_range: '15m' | '1h' | '6h' | '24h' | '7d';
  contamination: number;
  n_estimators: number;
  notes?: string;
}

export interface ModelTrainResponse {
  model_id: string;
  version: string;
  training_sample_count: number;
  holdout_sample_count: number;
  contamination: number;
  n_estimators: number;
  anomaly_rate: number;
  score_mean: number;
  score_std: number;
  stability_assessment: string;
  score_quantiles: Record<string, number>;
  evaluation_disclaimer: string;
  is_active: boolean;
  created_at: string;
  status: string;
}

export interface ModelEvaluationResponse {
  model_id: string;
  version: string;
  evaluation_samples: number;
  anomaly_rate: number;
  score_quantiles: Record<string, number>;
  score_mean: number;
  score_std: number;
  stability_assessment: string;
}

export interface MLStatusResponse {
  engine_status: 'ONLINE' | 'UNINITIALIZED' | 'DEGRADED';
  active_model_version?: string;
  active_model_id?: string;
  total_registered_models: number;
  prometheus_connected: boolean;
  last_training_time?: string;
  total_anomalies_recorded: number;
  features_active: string[];
}

export interface FeatureItem {
  name: string;
  description: string;
  unit: string;
  metric_type?: string;
  is_derived: boolean;
}

export interface FeatureSchemaResponse {
  base_features: FeatureItem[];
  derived_features: FeatureItem[];
  total_features: number;
}

export interface AnomalyEvent {
  id: string;
  timestamp: string;
  host_id: string;
  score: number;
  raw_score?: number;
  prediction: PredictionEnum;
  is_anomaly: boolean;
  severity: AnomalySeverityEnum;
  contributing_metrics: string[];
  feature_snapshot: Record<string, number>;
  explanation: string;
  model_version?: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  investigation_notes?: string;
}

export interface AnomalyDetectionRequest {
  host_id?: string;
  features?: Record<string, number>;
  persist?: boolean;
}

export interface AnomalyDetectionResponse {
  timestamp: string;
  host_id: string;
  features: Record<string, number>;
  prediction: PredictionEnum;
  score: number;
  raw_score: number;
  severity: AnomalySeverityEnum;
  contributing_metrics: string[];
  model_version?: string;
  detection_status: string;
  explanation: string;
  event_id?: string;
}

export interface AnomalySummaryResponse {
  total_detections: number;
  normal_count: number;
  anomalous_count: number;
  unknown_count: number;
  severity_breakdown: Record<string, number>;
  acknowledged_count: number;
  unacknowledged_count: number;
  active_model_version?: string;
  last_detection_timestamp?: string;
}

export interface TimelineBucket {
  timestamp: number;
  time_label: string;
  total_count: number;
  anomalous_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

export interface AnomalyTimelineResponse {
  buckets: TimelineBucket[];
  start_time: number;
  end_time: number;
  bucket_size_seconds: number;
  total_events: number;
}

export interface AnomalyAcknowledgeRequest {
  acknowledged_by: string;
  notes?: string;
}
