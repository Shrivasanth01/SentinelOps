import React from 'react';
import { Cpu, Activity } from 'lucide-react';
import { CpuMetrics } from '../../types/metrics';

interface CpuVisualizerProps {
  cpu: CpuMetrics | undefined;
}

export const CpuVisualizer: React.FC<CpuVisualizerProps> = ({ cpu }) => {
  if (!cpu) return null;

  const getBarColor = (pct: number) => {
    if (pct >= 85) return 'bg-rose-500 text-rose-400';
    if (pct >= 65) return 'bg-amber-500 text-amber-400';
    return 'bg-blue-500 text-blue-400';
  };

  return (
    <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400 border border-blue-500/20">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Central Processing Units</h3>
            <p className="text-xs text-slate-400 font-mono">
              {cpu.count_logical} Logical Cores {cpu.count_physical ? `(${cpu.count_physical} Physical)` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono text-white">
            {cpu.overall_percent}%
          </span>
          <span className="text-xs font-mono text-slate-400">load</span>
        </div>
      </div>

      {/* Primary Aggregate Bar */}
      <div className="mt-5 space-y-1.5">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">Total CPU Utilization</span>
          <span className="text-slate-200 font-semibold">{cpu.overall_percent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-navy-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getBarColor(cpu.overall_percent).split(' ')[0]}`}
            style={{ width: `${Math.min(100, Math.max(0, cpu.overall_percent))}%` }}
          />
        </div>
      </div>

      {/* Per-Core Distribution Grid */}
      <div className="mt-6">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-blue-400" />
          <span>Core Breakdown ({cpu.per_cpu_percent.length} Cores)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {cpu.per_cpu_percent.map((pct, idx) => {
            const [bgClass, textClass] = getBarColor(pct).split(' ');
            return (
              <div
                key={idx}
                className="rounded-lg border border-navy-800 bg-navy-850/80 p-2.5 flex flex-col justify-between"
              >
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-slate-400">CPU {idx}</span>
                  <span className={`font-semibold ${textClass}`}>{pct}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-navy-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${bgClass}`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unix Load Averages if available */}
      {cpu.load_avg_1m !== null && cpu.load_avg_1m !== undefined && (
        <div className="mt-5 pt-4 border-t border-navy-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Load Avg:</span>
          <span className="text-slate-200">
            1m: <b className="text-blue-400">{cpu.load_avg_1m}</b> | 5m: <b className="text-blue-400">{cpu.load_avg_5m}</b> | 15m: <b className="text-blue-400">{cpu.load_avg_15m}</b>
          </span>
        </div>
      )}
    </div>
  );
};
