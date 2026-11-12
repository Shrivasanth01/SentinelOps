import React from 'react';
import {
  Activity,
  Database,
  Layers,
  Server,
  Info,
  ExternalLink,
  Cpu,
  HardDrive,
  Network,
  Zap,
} from 'lucide-react';
import { HealthState } from '../hooks/useHealth';
import { useMetrics } from '../hooks/useMetrics';
import { ConnectivityPanel } from '../components/dashboard/ConnectivityPanel';
import { SystemHealthCard } from '../components/dashboard/SystemHealthCard';
import { DatabaseStatusCard } from '../components/dashboard/DatabaseStatusCard';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';

interface OverviewPageProps {
  healthState: HealthState;
  onRefresh: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  healthState,
  onRefresh,
}) => {
  const { backendConnected, databaseConnected, liveness, readiness, systemInfo, configSummary } =
    healthState;
  const { current: telemetry } = useMetrics(4000, backendConnected);

  const formatRate = (rate?: number) => {
    if (!rate) return '0 B/s';
    if (rate >= 1024 * 1024) return `${(rate / (1024 * 1024)).toFixed(1)} MB/s`;
    if (rate >= 1024) return `${(rate / 1024).toFixed(0)} KB/s`;
    return `${rate.toFixed(0)} B/s`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Platform Overview
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Phase 1 & 2 Active
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time backend connectivity, database readiness, and live host telemetry metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="http://127.0.0.1:8000/metrics"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <span>Prometheus Scrape</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
          <a
            href="http://127.0.0.1:8000/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <span>OpenAPI Docs</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Primary Connectivity Alert Banner */}
      <ConnectivityPanel healthState={healthState} onRefresh={onRefresh} />

      {/* 4 Core Architecture Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="FastAPI Service"
          value={backendConnected ? 'OPERATIONAL' : 'OFFLINE'}
          subtitle={backendConnected ? `Uptime: ${liveness?.uptime_seconds ?? 0}s` : 'Unreachable'}
          icon={Activity}
          accentColor={backendConnected ? 'emerald' : 'rose'}
          badge={
            <StatusBadge
              status={backendConnected ? 'healthy' : 'unhealthy'}
              size="sm"
              showPulse={false}
            />
          }
        />

        <MetricCard
          title="PostgreSQL 17"
          value={databaseConnected ? 'READY' : 'OFFLINE'}
          subtitle={databaseConnected ? `Ping: ${readiness?.database.latency_ms ?? 0}ms` : 'Disconnected'}
          icon={Database}
          accentColor={databaseConnected ? 'emerald' : 'rose'}
          badge={
            <StatusBadge
              status={databaseConnected ? 'healthy' : 'unhealthy'}
              size="sm"
              showPulse={false}
            />
          }
        />

        <MetricCard
          title="API Version"
          value={systemInfo?.version || 'v0.1.0'}
          subtitle="REST /api/v1 endpoints"
          icon={Layers}
          accentColor="blue"
          badge={
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Pydantic v2
            </span>
          }
        />

        <MetricCard
          title="Connection Pool"
          value={`${configSummary?.db_pool_size ?? 10} Connections`}
          subtitle={`Max overflow: +${configSummary?.db_max_overflow ?? 20}`}
          icon={Server}
          accentColor="cyan"
          badge={
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Async Pool
            </span>
          }
        />
      </div>

      {/* Real Host Telemetry Preview Row (Phase 2 Live) */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/80 p-6 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-navy-800 mb-5">
          <div className="flex items-center gap-2.5">
            <Zap className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-white text-base">Live Host Telemetry Snapshot</h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Sampling: 5.0s
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Cpu className="h-4 w-4 text-blue-400" />
              <span>CPU Utilization</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-400">
              {telemetry ? `${telemetry.cpu.overall_percent}%` : '--'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {telemetry ? `${telemetry.cpu.count_logical} cores` : 'detecting...'}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>RAM Allocation</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-400">
              {telemetry ? `${telemetry.memory.percent}%` : '--'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {telemetry ? `${(telemetry.memory.used_bytes / (1024 ** 3)).toFixed(1)} / ${(telemetry.memory.total_bytes / (1024 ** 3)).toFixed(1)} GB` : 'detecting...'}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <div className="flex items-center gap-1.5 text-slate-400">
              <HardDrive className="h-4 w-4 text-cyan-400" />
              <span>Storage Usage</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-cyan-400">
              {telemetry && telemetry.disk.partitions.length > 0 ? `${telemetry.disk.partitions[0].percent}%` : '--'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {telemetry ? `${telemetry.disk.partitions.length} partitions` : 'detecting...'}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Network className="h-4 w-4 text-emerald-400" />
              <span>Network I/O Rate</span>
            </div>
            <div className="mt-2 text-base font-bold text-emerald-400 truncate">
              {telemetry ? `↓ ${formatRate(telemetry.network.bytes_recv_rate_per_sec)}` : '--'}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 truncate">
              {telemetry ? `↑ ${formatRate(telemetry.network.bytes_sent_rate_per_sec)}` : 'detecting...'}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Diagnostics Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthCard
          liveness={liveness}
          systemInfo={systemInfo}
          connected={backendConnected}
        />
        <DatabaseStatusCard
          database={readiness?.database}
          config={configSummary}
          connected={databaseConnected}
        />
      </div>

      {/* Engineering Integrity Notice */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400 border border-blue-500/20 flex-shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">
              Strict Real-Data Observability Standard
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              All metrics and time-series data displayed across SentinelOps represent verified host operating system
              telemetry collected via asynchronous non-blocking kernel calls. Synthetic metrics are never injected.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 font-mono text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-navy-850 border border-navy-700">
          Prometheus Target: /metrics
        </div>
      </div>
    </div>
  );
};
