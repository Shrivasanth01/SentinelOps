import { useState, useEffect, useCallback, useRef } from 'react';
import { healthService } from '../services/healthService';
import {
  LivenessResponse,
  ReadinessResponse,
  SystemInfoResponse,
  ConfigSummaryResponse,
  TelemetryHeaders,
} from '../types/health';

export interface HealthState {
  liveness: LivenessResponse | null;
  readiness: ReadinessResponse | null;
  systemInfo: SystemInfoResponse | null;
  configSummary: ConfigSummaryResponse | null;
  backendConnected: boolean;
  databaseConnected: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  error: string | null;
  telemetry: TelemetryHeaders;
}

export function useHealth(pollIntervalMs: number = 5000, enabled: boolean = true) {
  const [state, setState] = useState<HealthState>({
    liveness: null,
    readiness: null,
    systemInfo: null,
    configSummary: null,
    backendConnected: false,
    databaseConnected: false,
    isLoading: true,
    isRefreshing: false,
    lastUpdated: null,
    error: null,
    telemetry: {},
  });

  const isMountedRef = useRef(true);

  const fetchAll = useCallback(async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) {
      setState((prev) => ({ ...prev, isRefreshing: true }));
    }

    try {
      const [liveRes, readyRes, infoRes, configRes] = await Promise.all([
        healthService.getLiveness(),
        healthService.getReadiness(),
        healthService.getSystemInfo(),
        healthService.getConfigSummary(),
      ]);

      if (!isMountedRef.current) return;

      const backendConnected = liveRes.ok && liveRes.data !== null;
      const databaseConnected =
        readyRes.ok &&
        readyRes.data !== null &&
        readyRes.data.database.connected === true;

      const errorMessage = !backendConnected
        ? liveRes.error || 'FastAPI Backend unreachable'
        : !databaseConnected
        ? readyRes.data?.database.error || 'PostgreSQL database disconnected'
        : null;

      setState({
        liveness: liveRes.data,
        readiness: readyRes.data,
        systemInfo: infoRes.data,
        configSummary: configRes.data,
        backendConnected,
        databaseConnected,
        isLoading: false,
        isRefreshing: false,
        lastUpdated: new Date(),
        error: errorMessage,
        telemetry: liveRes.telemetry.correlationId
          ? liveRes.telemetry
          : readyRes.telemetry,
      });
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        backendConnected: false,
        databaseConnected: false,
        error: err instanceof Error ? err.message : 'Unknown connectivity failure',
        lastUpdated: new Date(),
      }));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAll();

    if (!enabled || pollIntervalMs <= 0) return;

    const interval = setInterval(() => {
      fetchAll(false);
    }, pollIntervalMs);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAll, pollIntervalMs, enabled]);

  const refresh = useCallback(() => {
    return fetchAll(true);
  }, [fetchAll]);

  return { ...state, refresh };
}

