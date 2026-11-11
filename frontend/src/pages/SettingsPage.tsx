import React from 'react';
import { Sliders, Shield, Globe } from 'lucide-react';
import { HealthState } from '../hooks/useHealth';

interface SettingsPageProps {
  healthState: HealthState;
  pollInterval: number;
  onSetPollInterval: (ms: number) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  healthState,
  pollInterval,
  onSetPollInterval,
}) => {
  const { configSummary, systemInfo } = healthState;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Runtime environment configuration, polling cadence, and API gateway parameters.
        </p>
      </div>

      {/* Polling Cadence */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/80 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Diagnostic Polling Cadence</h3>
            <p className="text-xs text-slate-400">
              Frequency of automated health checks to /api/v1/health endpoints.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Fast (2 sec)', val: 2000 },
            { label: 'Normal (5 sec)', val: 5000 },
            { label: 'Relaxed (15 sec)', val: 15000 },
            { label: 'Slow (30 sec)', val: 30000 },
            { label: 'Paused', val: 0 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => onSetPollInterval(item.val)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                pollInterval === item.val
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-navy-850 text-slate-300 border-navy-700 hover:border-slate-500 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Backend Configuration Summary */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/80 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">FastAPI Core Configuration</h3>
            <p className="text-xs text-slate-400">
              Verified runtime parameters reported by the backend API.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-950/60 flex justify-between items-center">
            <span className="text-slate-400">Environment:</span>
            <span className="text-blue-400 font-semibold uppercase">{systemInfo?.environment || 'development'}</span>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-950/60 flex justify-between items-center">
            <span className="text-slate-400">API Version Prefix:</span>
            <span className="text-slate-200">{configSummary?.api_v1_prefix || '/api/v1'}</span>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-950/60 flex justify-between items-center">
            <span className="text-slate-400">PostgreSQL Host:</span>
            <span className="text-slate-200">{configSummary?.postgres_host || 'localhost'}</span>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-950/60 flex justify-between items-center">
            <span className="text-slate-400">PostgreSQL Port:</span>
            <span className="text-slate-200">{configSummary?.postgres_port || 5432}</span>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-950/60 flex justify-between items-center">
            <span className="text-slate-400">Database Name:</span>
            <span className="text-slate-200">{configSummary?.postgres_db || 'sentinelops_db'}</span>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-950/60 flex justify-between items-center">
            <span className="text-slate-400">Database Pool Size:</span>
            <span className="text-emerald-400">{configSummary?.db_pool_size || 10}</span>
          </div>
        </div>

        {configSummary?.cors_origins && (
          <div className="mt-4 p-4 rounded-xl border border-navy-800 bg-navy-950/60 text-xs font-mono">
            <div className="text-slate-400 mb-2">Allowed CORS Origins:</div>
            <div className="flex flex-wrap gap-2">
              {configSummary.cors_origins.map((origin: string) => (
                <span
                  key={origin}
                  className="px-2 py-1 rounded bg-navy-800 border border-navy-700 text-slate-300"
                >
                  {origin}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Brand & Architecture Note */}
      <div className="p-5 rounded-2xl border border-navy-800 bg-navy-950/40 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-400" />
          <span>SentinelOps &mdash; "Always watching. Always aware."</span>
        </div>
        <span>Phase 1 Architecture Edition</span>
      </div>
    </div>
  );
};
