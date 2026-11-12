export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AnomalyEvent {
  id: string;
  timestamp: string;
  score: number;
  is_anomaly: boolean;
  severity: AnomalySeverity;
  contributing_metrics: string[];
  description: string;
  resolved: boolean;
}

export interface AnomalyScoreResponse {
  score: number;
  is_anomaly: boolean;
  status: string;
  severity: AnomalySeverity;
  contributing_metrics: string[];
  model_trained: boolean;
  baseline_samples: number;
  timestamp: string;
}

export interface AnomalyHistoryResponse {
  anomalies: AnomalyEvent[];
  total_count: number;
}

export interface ModelTrainResponse {
  success: boolean;
  sample_count: number;
  contamination: number;
  message: string;
}
