import { useState, useEffect, useCallback } from 'react';
import { topologyService } from '../services/topologyService';
import { TopologyResponse } from '../types/topology';

export function useTopology(
  autoRefreshInterval: number = 30000,
  enabled: boolean = true
) {
  const [data, setData] = useState<TopologyResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const resp = await topologyService.getTopology();
      if (resp.ok && resp.data) {
        setData(resp.data);
        setError(null);
      } else {
        setError(resp.error || 'Failed to fetch infrastructure topology');
      }
    } catch (err: any) {
      setError(err?.message || 'Error querying topology service');
    } finally {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }
  }, [enabled]);

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

