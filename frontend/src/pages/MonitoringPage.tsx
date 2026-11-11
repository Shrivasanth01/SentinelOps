import React from 'react';
import { Cpu, Gauge, Zap, LineChart } from 'lucide-react';

export const MonitoringPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Live Monitoring & Telemetry</h1>
          <p className="text-sm text-slate-400 mt-1">
            Time-series telemetry, CPU load, memory utilization, I/O rates, and process execution graphs.
          </p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
          Scheduled: Phase 2
        </span>
      </div>

      <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
        <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
          <Cpu className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">High-Resolution Telemetry Pipeline</h3>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          Phase 2 will integrate Prometheus-compatible scrapers, kernel eBPF monitors, and background daemon collectors
          streaming real-time system performance counters.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left font-mono text-xs">
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Gauge className="h-4 w-4 text-blue-400 mb-2" />
            <div className="font-bold text-slate-200">CPU & Memory</div>
            <div className="text-slate-400 text-[11px] mt-1">100ms sampling window with per-core analysis</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Zap className="h-4 w-4 text-amber-400 mb-2" />
            <div className="font-bold text-slate-200">Process Profiling</div>
            <div className="text-slate-400 text-[11px] mt-1">Thread count, FD descriptors & RSS memory</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <LineChart className="h-4 w-4 text-emerald-400 mb-2" />
            <div className="font-bold text-slate-200">Time Series Engine</div>
            <div className="text-slate-400 text-[11px] mt-1">Multi-retention downsampling & historical baselining</div>
          </div>
        </div>
      </div>
    </div>
  );
};

