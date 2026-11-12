import React from 'react';
import { Network, ArrowDown, ArrowUp } from 'lucide-react';
import { NetworkMetrics } from '../../types/metrics';

interface NetworkThroughputWidgetProps {
  network: NetworkMetrics | undefined;
}

export const NetworkThroughputWidget: React.FC<NetworkThroughputWidgetProps> = ({ network }) => {
  if (!network) return null;

  const formatRate = (bytesPerSec: number) => {
    if (bytesPerSec >= 1024 * 1024) {
      return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
    }
    if (bytesPerSec >= 1024) {
      return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    }
    return `${bytesPerSec.toFixed(0)} B/s`;
  };

  const toMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/20">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Network Interfaces</h3>
            <p className="text-xs text-slate-400 font-mono">Real-Time Throughput</p>
          </div>
        </div>

        <span className="text-xs font-mono px-2 py-0.5 rounded bg-navy-800 text-emerald-400 border border-navy-700">
          {network.interfaces.length} Interfaces
        </span>
      </div>

      {/* Live Rate Badges */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-navy-800 bg-navy-850/80 p-4">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-1">
            <ArrowDown className="h-4 w-4 text-emerald-400" />
            <span>Inbound (RX)</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {formatRate(network.bytes_recv_rate_per_sec)}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Total: {toMB(network.total_bytes_recv)} MB
          </div>
        </div>

        <div className="rounded-xl border border-navy-800 bg-navy-850/80 p-4">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-1">
            <ArrowUp className="h-4 w-4 text-blue-400" />
            <span>Outbound (TX)</span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-400">
            {formatRate(network.bytes_sent_rate_per_sec)}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            Total: {toMB(network.total_bytes_sent)} MB
          </div>
        </div>
      </div>

      {/* Interface List */}
      <div className="mt-5 space-y-2 max-h-36 overflow-y-auto pr-1">
        {network.interfaces.map((iface, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 rounded-lg bg-navy-950/60 border border-navy-800/80 text-xs font-mono"
          >
            <span className="text-slate-300 font-semibold">{iface.interface}</span>
            <span className="text-slate-400">
              RX: {toMB(iface.bytes_recv)} MB | TX: {toMB(iface.bytes_sent)} MB
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

