import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';
import { BaselinesResponse } from '../types/analytics';

export function useBaselines(
  duration: string = '24h',
  autoRefreshInterval: number = 20000,
  enabled: boolean = true
) {
  const [data, setData] = useState<BaselinesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const resp = await analyticsService.getBaselines(duration);
      if (resp.ok && resp.data) {
        setData(resp.data);
        setError(null);
      } else {
        setError(resp.error || 'Failed to fetch statistical baselines');
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with baseline engine');
    } finally {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }
  }, [duration, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefreshInterval <= 0 || !enabled) return;
    const interval = setInterval(fetchData, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, autoRefreshInterval, enabled]);

  return {
    data,
    isLoading,
    error,
    lastRefreshed,
    refresh: fetchData,
  };
}

