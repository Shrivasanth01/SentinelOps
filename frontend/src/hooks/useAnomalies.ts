import { useState, useEffect, useCallback, useRef } from 'react';
import { anomalyService } from '../services/anomalyService';
import {
  AnomalyScoreResponse,
  AnomalyEvent,
  AnomalySeverity,
} from '../types/anomalies';

export function useAnomalies(pollIntervalMs: number = 4000, enabled: boolean = true) {
  const [score, setScore] = useState<AnomalyScoreResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  const isMountedRef = useRef(true);

  const fetchAnomalyData = useCallback(async () => {
    try {
      const [scoreRes, recentRes] = await Promise.all([
        anomalyService.getScore(),
        anomalyService.getRecent(20),
      ]);

      if (!isMountedRef.current) return;

      if (scoreRes.ok && scoreRes.data) {
        setScore(scoreRes.data);
      }
      if (recentRes.ok && recentRes.data) {
        setAnomalies(recentRes.data.anomalies);
      }
      setLastScan(new Date());
      setIsLoading(false);
    } catch {
      // transient failure
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAnomalyData();

    if (!enabled || pollIntervalMs <= 0) return;

    const interval = setInterval(() => {
      fetchAnomalyData();
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAnomalyData, pollIntervalMs, enabled]);

  const retrain = async () => {
    setIsRetraining(true);
    await anomalyService.retrainModel();
    await fetchAnomalyData();
    setIsRetraining(false);
  };

  const simulate = async (severity: AnomalySeverity, metric: string) => {
    await anomalyService.simulateAnomaly(severity, metric);
    await fetchAnomalyData();
  };

  return {
    score,
    anomalies,
    isLoading,
    isRetraining,
    lastScan,
    refresh: fetchAnomalyData,
    retrain,
    simulate,
  };
}

