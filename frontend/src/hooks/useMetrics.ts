import { useState, useEffect, useCallback, useRef } from 'react';
import { metricsService } from '../services/metricsService';
import {
  HostMetricsSnapshot,
  MetricsHistoryResponse,
  MetricsSummaryResponse,
} from '../types/metrics';

export interface MetricsState {
  current: HostMetricsSnapshot | null;
  history: MetricsHistoryResponse | null;
  summary: MetricsSummaryResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useMetrics(pollIntervalMs: number = 4000, enabled: boolean = true) {
  const [state, setState] = useState<MetricsState>({
    current: null,
    history: null,
    summary: null,
    isLoading: true,
    isRefreshing: false,
    lastUpdated: null,
    error: null,
  });

  const isMountedRef = useRef(true);

  const fetchMetrics = useCallback(async (isManual: boolean = false) => {
    if (isManual) {
      setState((prev) => ({ ...prev, isRefreshing: true }));
    }

    try {
      const [currentRes, historyRes, summaryRes] = await Promise.all([
        metricsService.getCurrent(),
        metricsService.getHistory(30),
        metricsService.getSummary(300),
      ]);

      if (!isMountedRef.current) return;

      if (currentRes.ok && currentRes.data) {
        setState({
          current: currentRes.data,
          history: historyRes.data,
          summary: summaryRes.data,
          isLoading: false,
          isRefreshing: false,
          lastUpdated: new Date(),
          error: null,
        });
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isRefreshing: false,
          error: currentRes.error || 'Failed to fetch host metrics',
        }));
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: err instanceof Error ? err.message : 'Metrics network error',
      }));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchMetrics();

    if (!enabled || pollIntervalMs <= 0) return;

    const interval = setInterval(() => {
      fetchMetrics(false);
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchMetrics, pollIntervalMs, enabled]);

  const refresh = useCallback(() => {
    return fetchMetrics(true);
  }, [fetchMetrics]);

  return { ...state, refresh };
}
