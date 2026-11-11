import React from 'react';
import {
  Activity,
  Database,
  Layers,
  Server,
  Info,
  ExternalLink,
} from 'lucide-react';
import { HealthState } from '../hooks/useHealth';
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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Platform Overview
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Phase 1: Foundation
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time backend process status, database connection verification, and architecture diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* 4 Core Metric Summary Cards */}
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

      {/* Architecture Transparency Notice */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400 border border-blue-500/20 flex-shrink-0 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">
              Phase 1 Engineering Notice: Strict Real-Data Compliance
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              Per architectural guidelines, SentinelOps never presents simulated or fabricated operational metrics.
              Host CPU, memory, and disk telemetry will be captured in Phase 2 via dedicated background monitoring probes.
              All statuses shown on this dashboard reflect live network roundtrips to the FastAPI backend and PostgreSQL database.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 font-mono text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-navy-850 border border-navy-700">
          Target: SentinelOps Core v0.1
        </div>
      </div>
    </div>
  );
};
