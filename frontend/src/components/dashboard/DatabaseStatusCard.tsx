import React from 'react';
import { Database, Zap, Layers, Server, AlertCircle } from 'lucide-react';
import { DatabaseHealth, ConfigSummaryResponse } from '../../types/health';
import { StatusBadge } from '../common/StatusBadge';

interface DatabaseStatusCardProps {
  database: DatabaseHealth | undefined;
  config: ConfigSummaryResponse | null;
  connected: boolean;
}

export const DatabaseStatusCard: React.FC<DatabaseStatusCardProps> = ({
  database,
  config,
  connected,
}) => {
  const poolInfo = database?.pool_info;

  return (
    <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-4 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 border border-indigo-500/20">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">PostgreSQL Persistence</h3>
            <p className="text-xs text-slate-400 font-mono">SQLAlchemy 2.x + Psycopg 3</p>
          </div>
        </div>
        <StatusBadge
          status={connected ? 'healthy' : 'unhealthy'}
          label={connected ? 'CONNECTED' : 'DISCONNECTED'}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Query Ping Latency</span>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-white">
            {connected ? `${database?.latency_ms ?? 0} ms` : 'N/A'}
          </div>
        </div>

        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>Pool Capacity</span>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-white">
            {poolInfo?.pool_size ?? config?.db_pool_size ?? 10} connections
          </div>
        </div>

        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Server className="h-3.5 w-3.5 text-blue-400" />
            <span>Target Database</span>
          </div>
          <div className="mt-2 text-sm font-semibold font-mono text-slate-200 truncate">
            {config?.postgres_db || 'sentinelops_db'}
          </div>
        </div>

        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span>Target Host</span>
          </div>
          <div className="mt-2 text-xs font-mono text-slate-300 truncate">
            {config ? `${config.postgres_host}:${config.postgres_port}` : 'postgres:5432'}
          </div>
        </div>
      </div>

      {database?.error ? (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs font-mono text-rose-300 truncate">
            {database.error}
          </div>
        </div>
      ) : (
        <div className="mt-5 pt-4 border-t border-navy-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Readiness Probe:</span>
          <span className="text-emerald-400">SELECT 1 (Verified)</span>
        </div>
      )}
    </div>
  );
};

