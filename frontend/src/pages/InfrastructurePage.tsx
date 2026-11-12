import React from 'react';
import { Server, Cpu, HardDrive, Network } from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';

export const InfrastructurePage: React.FC = () => {
  const { current } = useMetrics(5000, true);

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Infrastructure Inventory</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Live Fleet
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Hardware topology, CPU architecture, storage controllers, and host operating system.
          </p>
        </div>
      </div>

      {/* Host Node Master Card */}
      <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-navy-800">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {current?.host_name || 'localhost'}
                </h2>
                <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {current?.platform || 'Detecting operating system...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
            <div className="p-2.5 rounded-lg bg-navy-850 border border-navy-800">
              Uptime: <b className="text-slate-200">{formatUptime(current?.system.uptime_seconds)}</b>
            </div>
            <div className="p-2.5 rounded-lg bg-navy-850 border border-navy-800">
              Processes: <b className="text-blue-400">{current?.system.process_count || 0}</b>
            </div>
          </div>
        </div>

        {/* Hardware Specifications Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs">
          {/* Processor Card */}
          <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Cpu className="h-4 w-4 text-blue-400" />
              <span>Processor Topology</span>
            </div>
            <div className="space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span>Logical Processors:</span>
                <span className="text-white font-bold">{current?.cpu.count_logical ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Physical Sockets:</span>
                <span className="text-slate-300">{current?.cpu.count_physical ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Frequency:</span>
                <span className="text-blue-400">{current?.cpu.overall_percent}% active</span>
              </div>
            </div>
          </div>

          {/* Memory Controller */}
          <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <HardDrive className="h-4 w-4 text-indigo-400" />
              <span>Memory Controller</span>
            </div>
            <div className="space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span>Installed RAM:</span>
                <span className="text-white font-bold">
                  {current ? (current.memory.total_bytes / (1024 ** 3)).toFixed(1) : 0} GB
                </span>
              </div>
              <div className="flex justify-between">
                <span>Allocated:</span>
                <span className="text-slate-300">{current?.memory.percent}%</span>
              </div>
              <div className="flex justify-between">
                <span>Available Buffer:</span>
                <span className="text-emerald-400">
                  {current ? (current.memory.available_bytes / (1024 ** 3)).toFixed(1) : 0} GB
                </span>
              </div>
            </div>
          </div>

          {/* Network Controller */}
          <div className="rounded-xl border border-navy-800 bg-navy-850/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Network className="h-4 w-4 text-emerald-400" />
              <span>Network Controller</span>
            </div>
            <div className="space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span>Active Interfaces:</span>
                <span className="text-white font-bold">{current?.network.interfaces.length ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Sent (TX):</span>
                <span className="text-slate-300">
                  {current ? (current.network.total_bytes_sent / (1024 ** 2)).toFixed(1) : 0} MB
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Received (RX):</span>
                <span className="text-slate-300">
                  {current ? (current.network.total_bytes_recv / (1024 ** 2)).toFixed(1) : 0} MB
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Interface Breakdown Table */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/80 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono mb-4 flex items-center gap-2">
          <Network className="h-4 w-4 text-blue-400" />
          <span>Network Adapter Telemetry</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400">
                <th className="pb-3 font-semibold">Interface</th>
                <th className="pb-3 font-semibold">Bytes Sent</th>
                <th className="pb-3 font-semibold">Bytes Recv</th>
                <th className="pb-3 font-semibold">Packets Sent</th>
                <th className="pb-3 font-semibold">Packets Recv</th>
                <th className="pb-3 font-semibold">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 text-slate-300">
              {(current?.network.interfaces || []).map((iface, idx) => (
                <tr key={idx} className="hover:bg-navy-850/40 transition-colors">
                  <td className="py-2.5 font-semibold text-white">{iface.interface}</td>
                  <td className="py-2.5">{(iface.bytes_sent / (1024 ** 2)).toFixed(2)} MB</td>
                  <td className="py-2.5">{(iface.bytes_recv / (1024 ** 2)).toFixed(2)} MB</td>
                  <td className="py-2.5">{iface.packets_sent.toLocaleString()}</td>
                  <td className="py-2.5">{iface.packets_recv.toLocaleString()}</td>
                  <td className="py-2.5 text-slate-400">
                    {iface.errin + iface.errout === 0 ? (
                      <span className="text-emerald-400">0</span>
                    ) : (
                      <span className="text-rose-400">{iface.errin + iface.errout}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
