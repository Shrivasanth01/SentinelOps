import React from 'react';
import { Activity, Database, Server, Radio } from 'lucide-react';

export interface SystemHealthIndicatorProps {
  backendConnected: boolean;
  databaseConnected: boolean;
  backendLatencyMs?: number;
  dbLatencyMs?: number;
  uptimeSeconds?: number;
  responseTimeMs?: number | string;
  compact?: boolean;
}

export const SystemHealthIndicator: React.FC<SystemHealthIndicatorProps> = ({
  backendConnected,
  databaseConnected,
  backendLatencyMs = 1.2,
  dbLatencyMs = 2.4,
  uptimeSeconds = 0,
  responseTimeMs,
  compact = false,
}) => {
  const isHealthy = backendConnected && databaseConnected;

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const latencyDisplay = responseTimeMs !== undefined ? responseTimeMs : backendLatencyMs;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-obs-border bg-obs-panel font-mono text-[11px] shadow-sm">
        <span className="relative flex h-2 w-2">
          {isHealthy && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-obs-healthy opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isHealthy ? 'bg-obs-healthy' : 'bg-obs-critical'
            }`}
          />
        </span>
        <span className="text-obs-text-muted hidden sm:inline">OBSERVATORY:</span>
        <span className={isHealthy ? 'text-obs-healthy font-semibold' : 'text-obs-critical font-semibold'}>
          {isHealthy ? 'NOMINAL' : 'DEGRADED'}
        </span>
        {isHealthy && latencyDisplay && (
          <span className="text-obs-text-muted text-[10px]">({latencyDisplay}ms)</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 font-mono text-xs">
      {/* Cluster Status Chip */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-obs-border bg-obs-panel shadow-sm">
        <span className="relative flex h-2 w-2">
          {isHealthy && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-obs-healthy opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isHealthy ? 'bg-obs-healthy' : 'bg-obs-critical'
            }`}
          />
        </span>
        <span className="text-obs-text-secondary font-semibold">OBSERVATORY:</span>
        <span className={isHealthy ? 'text-obs-healthy font-bold' : 'text-obs-critical font-bold'}>
          {isHealthy ? 'ALL SIGNALS NOMINAL' : 'DEGRADED'}
        </span>
      </div>

      {/* Micro Metrics Matrix */}
      <div className="hidden lg:flex items-center gap-4 px-3 py-1.5 rounded-lg border border-obs-border-subtle bg-obs-bg-secondary text-[11px] text-obs-text-secondary">
        <div className="flex items-center gap-1.5" title="FastAPI Core Engine">
          <Activity className="h-3 w-3 text-obs-accent" />
          <span>API:</span>
          <span className={backendConnected ? 'text-obs-text-primary' : 'text-obs-critical'}>
            {backendConnected ? `${latencyDisplay}ms` : 'OFFLINE'}
          </span>
        </div>

        <span className="text-obs-border">|</span>

        <div className="flex items-center gap-1.5" title="PostgreSQL 17 Persistence">
          <Database className="h-3 w-3 text-obs-accent" />
          <span>DB:</span>
          <span className={databaseConnected ? 'text-obs-text-primary' : 'text-obs-critical'}>
            {databaseConnected ? `${dbLatencyMs}ms` : 'OFFLINE'}
          </span>
        </div>

        <span className="text-obs-border">|</span>

        <div className="flex items-center gap-1.5" title="Telemetry Ingestion Cadence">
          <Radio className="h-3 w-3 text-obs-healthy animate-pulse" />
          <span>TICK:</span>
          <span className="text-obs-text-primary">5.0s</span>
        </div>

        <span className="text-obs-border">|</span>

        <div className="flex items-center gap-1.5" title="Continuous Operating Epoch">
          <Server className="h-3 w-3 text-obs-text-muted" />
          <span>UP:</span>
          <span className="text-obs-text-primary">{formatUptime(uptimeSeconds)}</span>
        </div>
      </div>
    </div>
  );
};
