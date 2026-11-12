import React from 'react';
import { RefreshCw, Activity, Clock } from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';
import { CpuVisualizer } from '../components/monitoring/CpuVisualizer';
import { MemoryBreakdown } from '../components/monitoring/MemoryBreakdown';
import { DiskStorageWidget } from '../components/monitoring/DiskStorageWidget';
import { NetworkThroughputWidget } from '../components/monitoring/NetworkThroughputWidget';
import { TimeSeriesChart } from '../components/monitoring/TimeSeriesChart';

export const MonitoringPage: React.FC = () => {
  const { current, history, summary, isRefreshing, lastUpdated, refresh, error } =
    useMetrics(3000, true);

  const cpuData = (history?.snapshots || []).map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: s.cpu.overall_percent,
  }));

  const memData = (history?.snapshots || []).map((s) => ({
    time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: s.memory.percent,
  }));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Live System Telemetry
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Phase 2: Active
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time host metrics sampled via background collector and exported to Prometheus.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--:--'}</span>
          </div>

          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-navy-800 text-white text-xs font-medium transition-all shadow-md shadow-blue-600/20"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sample Now</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-mono text-rose-300">
          Telemetry Error: {error}
        </div>
      )}

      {/* Summary KPI Bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/60 font-mono text-xs">
            <div className="text-slate-400">CPU Rolling Avg</div>
            <div className="mt-1 text-xl font-bold text-blue-400">
              {summary.cpu_percent_avg}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Peak: {summary.cpu_percent_max}% | Min: {summary.cpu_percent_min}%
            </div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/60 font-mono text-xs">
            <div className="text-slate-400">Memory Rolling Avg</div>
            <div className="mt-1 text-xl font-bold text-indigo-400">
              {summary.memory_percent_avg}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Peak: {summary.memory_percent_max}% | Min: {summary.memory_percent_min}%
            </div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/60 font-mono text-xs">
            <div className="text-slate-400">Disk Average</div>
            <div className="mt-1 text-xl font-bold text-cyan-400">
              {summary.disk_percent_avg}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Sample count: {summary.sample_count} ticks
            </div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-900/60 font-mono text-xs">
            <div className="text-slate-400">Prometheus Target</div>
            <div className="mt-1 text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              <span>/metrics (Active)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Scrape interval: 5.0s
            </div>
          </div>
        </div>
      )}

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeSeriesChart
          data={cpuData}
          title="CPU Utilization Trend (Historical)"
          unit="%"
          color="blue"
          minY={0}
          maxY={100}
        />
        <TimeSeriesChart
          data={memData}
          title="Memory Utilization Trend (Historical)"
          unit="%"
          color="cyan"
          minY={0}
          maxY={100}
        />
      </div>

      {/* Detailed Diagnostics Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CpuVisualizer cpu={current?.cpu} />
        <MemoryBreakdown memory={current?.memory} />
        <DiskStorageWidget disk={current?.disk} />
        <NetworkThroughputWidget network={current?.network} />
      </div>
    </div>
  );
};
