import { useState, useEffect, useCallback, useRef } from 'react';
import { logEngineService, LogQueryParams, LogCorrelationParams } from '../services/logEngineService';
import {
  ErrorIntelligenceResponse,
  LogCorrelationResponse,
  LogEntry,
  LogHealthResponse,
  LogLevel,
  LogSource,
  LogSourceCreate,
  LogSummaryResponse,
  LogTimelineResponse,
} from '../types/logs';

export function useLogIntelligence() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'explorer' | 'stream' | 'errors' | 'correlator' | 'sources'>('explorer');

  // Logs & Query state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [lokiConnected, setLokiConnected] = useState<boolean>(true);
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(0);

  // Filters
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Log for inspection drawer
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Summary, Errors, Timeline & Health
  const [summary, setSummary] = useState<LogSummaryResponse | null>(null);
  const [errorIntelligence, setErrorIntelligence] = useState<ErrorIntelligenceResponse | null>(null);
  const [timeline, setTimeline] = useState<LogTimelineResponse | null>(null);
  const [health, setHealth] = useState<LogHealthResponse | null>(null);

  // Correlation
  const [correlation, setCorrelation] = useState<LogCorrelationResponse | null>(null);
  const [correlateLoading, setCorrelateLoading] = useState<boolean>(false);

  // Sources
  const [sources, setSources] = useState<LogSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState<boolean>(false);

  const isMountedRef = useRef(true);

  // 1. Fetch Logs
  const fetchLogs = useCallback(async () => {
    try {
      const params: LogQueryParams = {
        level: levelFilter !== 'ALL' ? (levelFilter as LogLevel) : undefined,
        service: serviceFilter || undefined,
        source: sourceFilter || undefined,
        search: searchQuery || undefined,
        timeRange,
        limit: 100,
        offset: 0,
      };

      const res = await logEngineService.queryLogs(params);
      if (!isMountedRef.current) return;

      if (res.ok && res.data) {
        setLogs(res.data.logs);
        setTotalCount(res.data.total_count);
        setLokiConnected(res.data.loki_connected);
        setExecutionTimeMs(res.data.execution_time_ms);
      }
    } catch {
      // Graceful fallback
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [levelFilter, serviceFilter, sourceFilter, searchQuery, timeRange]);

  // 2. Fetch Summary & Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const [sumRes, errRes, timeRes, healthRes] = await Promise.all([
        logEngineService.getSummary(timeRange),
        logEngineService.getErrorIntelligence(timeRange),
        logEngineService.getTimeline(timeRange, 20),
        logEngineService.getHealth(),
      ]);

      if (!isMountedRef.current) return;
      if (sumRes.ok && sumRes.data) setSummary(sumRes.data);
      if (errRes.ok && errRes.data) setErrorIntelligence(errRes.data);
      if (timeRes.ok && timeRes.data) setTimeline(timeRes.data);
      if (healthRes.ok && healthRes.data) setHealth(healthRes.data);
    } catch {
      // Keep previous telemetry
    }
  }, [timeRange]);

  // 3. Fetch Sources
  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const res = await logEngineService.listSources();
      if (!isMountedRef.current) return;
      if (res.ok && res.data) {
        setSources(res.data.sources);
      }
    } catch {
      // Ignore
    } finally {
      if (isMountedRef.current) setSourcesLoading(false);
    }
  }, []);

  // Lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    fetchLogs();
    fetchAnalytics();
    fetchSources();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLogs, fetchAnalytics, fetchSources]);

  // Live Auto-Tail Polling for Stream & Explorer
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, 2500);

    return () => clearInterval(interval);
  }, [isStreaming, fetchLogs]);

  // Correlation Runner
  const runCorrelation = async (params: LogCorrelationParams) => {
    setCorrelateLoading(true);
    try {
      const res = await logEngineService.correlateMetric(params);
      if (res.ok && res.data) {
        setCorrelation(res.data);
      }
    } catch {
      // Ignore
    } finally {
      setCorrelateLoading(false);
    }
  };

  // Sources Mutations
  const createSource = async (data: LogSourceCreate) => {
    const res = await logEngineService.createSource(data);
    if (res.ok) {
      await fetchSources();
    }
    return res;
  };

  const updateSource = async (id: string, updates: Partial<LogSourceCreate>) => {
    const res = await logEngineService.updateSource(id, updates);
    if (res.ok) {
      await fetchSources();
    }
    return res;
  };

  const deleteSource = async (id: string) => {
    const res = await logEngineService.deleteSource(id);
    if (res.ok) {
      await fetchSources();
    }
    return res;
  };

  return {
    activeTab,
    setActiveTab,
    logs,
    totalCount,
    isLoading,
    isStreaming,
    setIsStreaming,
    lokiConnected,
    executionTimeMs,
    timeRange,
    setTimeRange,
    levelFilter,
    setLevelFilter,
    serviceFilter,
    setServiceFilter,
    sourceFilter,
    setSourceFilter,
    searchQuery,
    setSearchQuery,
    selectedLog,
    setSelectedLog,
    summary,
    errorIntelligence,
    timeline,
    health,
    correlation,
    correlateLoading,
    runCorrelation,
    sources,
    sourcesLoading,
    refreshSources: fetchSources,
    createSource,
    updateSource,
    deleteSource,
    refresh: () => {
      fetchLogs();
      fetchAnalytics();
    },
  };
}
