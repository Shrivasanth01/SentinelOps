import React from 'react';
import { Activity, Clock, ShieldCheck, Tag, Terminal } from 'lucide-react';
import { LivenessResponse, SystemInfoResponse } from '../../types/health';
import { StatusBadge } from '../common/StatusBadge';

interface SystemHealthCardProps {
  liveness: LivenessResponse | null;
  systemInfo: SystemInfoResponse | null;
  connected: boolean;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({
  liveness,
  systemInfo,
  connected,
}) => {
  const formatUptime = (seconds?: number) => {
    if (seconds === undefined) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between pb-4 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400 border border-blue-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Application Runtime</h3>
            <p className="text-xs text-slate-400 font-mono">FastAPI Core Service</p>
          </div>
        </div>
        <StatusBadge
          status={connected ? 'healthy' : 'unhealthy'}
          label={connected ? 'ALIVE' : 'DISCONNECTED'}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span>Process Uptime</span>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-white">
            {connected ? formatUptime(liveness?.uptime_seconds) : 'N/A'}
          </div>
        </div>

        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Tag className="h-3.5 w-3.5 text-cyan-400" />
            <span>Version</span>
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-white">
            {systemInfo?.version || 'v0.1.0'}
          </div>
        </div>

        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Terminal className="h-3.5 w-3.5 text-indigo-400" />
            <span>Python Engine</span>
          </div>
          <div className="mt-2 text-sm font-semibold font-mono text-slate-200 truncate">
            {systemInfo?.python_version ? `Python ${systemInfo.python_version}` : 'Python 3.12+'}
          </div>
        </div>

        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Probe Route</span>
          </div>
          <div className="mt-2 text-xs font-mono text-slate-300 truncate">
            GET /api/v1/health/live
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-navy-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
        <span>Host Platform:</span>
        <span className="text-slate-300 truncate max-w-[200px]">
          {systemInfo?.os_platform || 'Linux / POSIX'}
        </span>
      </div>
    </div>
  );
};
