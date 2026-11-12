import React from 'react';
import { Layers } from 'lucide-react';
import { MemoryMetrics } from '../../types/metrics';

interface MemoryBreakdownProps {
  memory: MemoryMetrics | undefined;
}

export const MemoryBreakdown: React.FC<MemoryBreakdownProps> = ({ memory }) => {
  if (!memory) return null;

  const toGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

  return (
    <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/10 p-2.5 text-indigo-400 border border-indigo-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Memory Allocation</h3>
            <p className="text-xs text-slate-400 font-mono">RAM & Swap Pools</p>
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold font-mono text-white">
            {memory.percent}%
          </span>
          <span className="text-xs font-mono text-slate-400">used</span>
        </div>
      </div>

      {/* Main RAM Bar */}
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">Physical Memory (RAM)</span>
          <span className="text-slate-200">
            {toGB(memory.used_bytes)} GB / {toGB(memory.total_bytes)} GB
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-navy-800 overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, memory.percent))}%` }}
          />
        </div>
      </div>

      {/* Memory Stat Badges */}
      <div className="mt-6 grid grid-cols-3 gap-3 font-mono text-xs">
        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3">
          <div className="text-slate-400">Used</div>
          <div className="mt-1 text-sm font-bold text-indigo-400">
            {toGB(memory.used_bytes)} GB
          </div>
        </div>

        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3">
          <div className="text-slate-400">Available</div>
          <div className="mt-1 text-sm font-bold text-emerald-400">
            {toGB(memory.available_bytes)} GB
          </div>
        </div>

        <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-3">
          <div className="text-slate-400">Total</div>
          <div className="mt-1 text-sm font-bold text-white">
            {toGB(memory.total_bytes)} GB
          </div>
        </div>
      </div>

      {/* Swap Space if configured */}
      {memory.swap_total_bytes > 0 && (
        <div className="mt-5 pt-4 border-t border-navy-800/80 space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Swap Allocation</span>
            <span className="text-slate-300">
              {toGB(memory.swap_used_bytes)} GB / {toGB(memory.swap_total_bytes)} GB ({memory.swap_percent}%)
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-navy-800 overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, memory.swap_percent))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
