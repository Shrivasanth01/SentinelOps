import { useState, useEffect, useCallback, useRef } from 'react';
import { logService } from '../services/logService';
import { LogEntry, LogLevel } from '../types/logs';

export function useLogs(pollIntervalMs: number = 3000, enabled: boolean = true) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [levelFilter, setLevelFilter] = useState<LogLevel | undefined>(undefined);
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(true);

  const isMountedRef = useRef(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await logService.getLogs({
        level: levelFilter,
        service: serviceFilter || undefined,
        search: searchQuery || undefined,
        limit: 100,
        offset: 0,
      });

      if (!isMountedRef.current) return;

      if (res.ok && res.data) {
        setLogs(res.data.logs);
        setTotalCount(res.data.total_count);
        setIsLoading(false);
      }
    } catch {
      // Keep existing logs on transient failure
    }
  }, [levelFilter, serviceFilter, searchQuery]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLogs();

    if (!enabled || pollIntervalMs <= 0) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchLogs, pollIntervalMs, enabled]);

  const emitSimulatedLog = async (level: LogLevel, service: string, message: string) => {
    await logService.simulateLog(level, service, message);
    fetchLogs();
  };

  return {
    logs,
    totalCount,
    isLoading,
    levelFilter,
    setLevelFilter,
    serviceFilter,
    setServiceFilter,
    searchQuery,
    setSearchQuery,
    isAutoScroll,
    setIsAutoScroll,
    refresh: fetchLogs,
    emitSimulatedLog,
  };
}
