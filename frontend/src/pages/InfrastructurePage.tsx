import React from 'react';
import { Server, HardDrive, Network, ShieldCheck } from 'lucide-react';

export const InfrastructurePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Infrastructure Fleet</h1>
          <p className="text-sm text-slate-400 mt-1">
            Server inventory, host hardware topologies, containerized nodes, and network gateways.
          </p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
          Scheduled: Phase 2
        </span>
      </div>

      <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
        <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5">
          <Server className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Fleet Discovery Engine</h3>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          The infrastructure module is reserved for Phase 2. It will provide real-time agent registration,
          multi-node clustering, hardware topology mapping, and automated cloud instance discovery.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left font-mono text-xs">
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <HardDrive className="h-4 w-4 text-cyan-400 mb-2" />
            <div className="font-bold text-slate-200">Disk & Storage</div>
            <div className="text-slate-400 text-[11px] mt-1">IOPS, mount point metrics & SMART disk monitoring</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Network className="h-4 w-4 text-indigo-400 mb-2" />
            <div className="font-bold text-slate-200">Network Interfaces</div>
            <div className="text-slate-400 text-[11px] mt-1">Throughput, packet drop detection & socket telemetry</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <ShieldCheck className="h-4 w-4 text-emerald-400 mb-2" />
            <div className="font-bold text-slate-200">Container Runtimes</div>
            <div className="text-slate-400 text-[11px] mt-1">Docker daemon stats & Kubernetes cgroup tracking</div>
          </div>
        </div>
      </div>
    </div>
  );
};
