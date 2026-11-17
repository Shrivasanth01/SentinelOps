export * from './ml';

// Backward compatibility types
export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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
  anomalies: any[];
  total_count: number;
}
