import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Database,
  Terminal,
  RefreshCw,
} from 'lucide-react';
import { HealthState } from '../../hooks/useHealth';
import { StatusBadge } from '../common/StatusBadge';

interface ConnectivityPanelProps {
  healthState: HealthState;
  onRefresh: () => void;
}

export const ConnectivityPanel: React.FC<ConnectivityPanelProps> = ({
  healthState,
  onRefresh,
}) => {
  const { backendConnected, databaseConnected, isLoading, liveness, readiness, error, isRefreshing } =
    healthState;

  const isFullyOperational = backendConnected && databaseConnected;
  const isPartiallyOperational = backendConnected && !databaseConnected;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-navy-700/80 bg-gradient-to-b from-navy-900 to-navy-950 p-6 shadow-xl">
      {/* Background glow effect */}
      <div
        className={`absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isFullyOperational
            ? 'bg-emerald-500'
            : isPartiallyOperational
            ? 'bg-amber-500'
            : 'bg-rose-500'
        }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Overall Health Banner */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {isLoading ? (
              <span className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            ) : isFullyOperational ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            ) : isPartiallyOperational ? (
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            ) : (
              <XCircle className="h-6 w-6 text-rose-400" />
            )}

            <h2 className="text-xl font-bold tracking-tight text-white">
              Platform Architecture Status
            </h2>

            <StatusBadge
              status={
                isLoading
                  ? 'checking'
                  : isFullyOperational
                  ? 'healthy'
                  : isPartiallyOperational
                  ? 'degraded'
                  : 'unhealthy'
              }
              label={
                isLoading
                  ? 'PROBING...'
                  : isFullyOperational
                  ? 'ALL SYSTEMS NOMINAL'
                  : isPartiallyOperational
                  ? 'DATABASE DEGRADED'
                  : 'BACKEND OFFLINE'
              }
              size="md"
            />
          </div>

          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            {isFullyOperational
              ? 'FastAPI application server and PostgreSQL database are online, responding within acceptable latency thresholds, and ready for operations.'
              : isPartiallyOperational
              ? 'FastAPI service is running, but PostgreSQL connectivity is failing or in recovery mode. Inspect container logs or connection pool.'
              : 'Cannot connect to SentinelOps FastAPI backend. Verify server is running on http://127.0.0.1:8000 or via Docker Compose.'}
          </p>

          {error && !isFullyOperational && (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-mono text-rose-300">
              <Terminal className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <span className="font-semibold text-rose-200">Diagnostics: </span>
                <span>{error}</span>
              </div>
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Micro Indicators */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* FastAPI indicator */}
          <div className="flex items-center gap-3 rounded-xl border border-navy-800 bg-navy-850/90 px-4 py-3 min-w-[160px]">
            <div
              className={`p-2 rounded-lg ${
                backendConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">FastAPI Core</div>
              <div className="text-sm font-semibold font-mono text-white">
                {backendConnected ? `${liveness?.uptime_seconds ?? 0}s up` : 'Offline'}
              </div>
            </div>
          </div>

          {/* Database indicator */}
          <div className="flex items-center gap-3 rounded-xl border border-navy-800 bg-navy-850/90 px-4 py-3 min-w-[160px]">
            <div
              className={`p-2 rounded-lg ${
                databaseConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">PostgreSQL 17</div>
              <div className="text-sm font-semibold font-mono text-white">
                {databaseConnected
                  ? `${readiness?.database.latency_ms ?? 0}ms`
                  : 'Unreachable'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
