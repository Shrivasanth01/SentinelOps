import { useState, useEffect, useCallback, useRef } from 'react';
import { monitoringService } from '../services/monitoringService';
import { MonitoringOverviewResponse, HistoryMetricsResponse } from '../types/monitoring';

export function usePrometheusMonitoring(
  pollIntervalMs: number = 3000,
  enabled: boolean = true
) {
  const [overview, setOverview] = useState<MonitoringOverviewResponse | null>(null);
  const [history, setHistory] = useState<HistoryMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [duration, setDuration] = useState<string>('15m');

  const isMountedRef = useRef(true);

  const fetchData = useCallback(
    async (isManual = false) => {
      if (!enabled) return;

      if (isManual) {
        setIsRefreshing(true);
      }

      try {
        const [overviewRes, historyRes] = await Promise.all([
          monitoringService.getOverview(),
          monitoringService.getHistory(['cpu', 'memory', 'disk', 'network'], duration, '15s'),
        ]);

        if (!isMountedRef.current) return;

        if (overviewRes.ok && overviewRes.data) {
          setOverview(overviewRes.data);
          setError(null);
        } else {
          setError(overviewRes.error || 'Failed to retrieve telemetry overview');
        }

        if (historyRes.ok && historyRes.data) {
          setHistory(historyRes.data);
        }

        setLastUpdated(new Date());
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : 'Telemetry request failed';
        setError(msg);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [enabled, duration]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    if (!enabled || pollIntervalMs <= 0) return;

    const interval = setInterval(() => {
      fetchData();
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData, enabled, pollIntervalMs]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return {
    overview,
    history,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    duration,
    setDuration,
    refresh,
  };
}
