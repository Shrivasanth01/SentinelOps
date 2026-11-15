import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';
import { HistoricalMetricResponse, TimeRange } from '../types/analytics';

export type TelemetrySubsystem = 'cpu' | 'memory' | 'disk' | 'network';

export function useHistoricalTelemetry(
  initialSubsystem: TelemetrySubsystem = 'cpu',
  initialRange: TimeRange = '15m',
  autoRefreshInterval: number = 10000,
  enabled: boolean = true
) {
  const [subsystem, setSubsystem] = useState<TelemetrySubsystem>(initialSubsystem);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialRange);
  const [data, setData] = useState<HistoricalMetricResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      let resp;
      switch (subsystem) {
        case 'cpu':
          resp = await analyticsService.getCpuHistory(timeRange);
          break;
        case 'memory':
          resp = await analyticsService.getMemoryHistory(timeRange);
          break;
        case 'disk':
          resp = await analyticsService.getDiskHistory(timeRange);
          break;
        case 'network':
          resp = await analyticsService.getNetworkHistory(timeRange);
          break;
      }

      if (resp.ok && resp.data) {
        setData(resp.data);
        setError(null);
      } else {
        setError(resp.error || 'Failed to fetch historical telemetry');
      }
    } catch (err: any) {
      setError(err?.message || 'Network exception while querying historical telemetry');
    } finally {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }
  }, [subsystem, timeRange, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefreshInterval <= 0 || !enabled) return;
    const interval = setInterval(fetchData, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, autoRefreshInterval, enabled]);

  return {
    subsystem,
    setSubsystem,
    timeRange,
    setTimeRange,
    data,
    isLoading,
    error,
    lastRefreshed,
    refresh: fetchData,
  };
}

