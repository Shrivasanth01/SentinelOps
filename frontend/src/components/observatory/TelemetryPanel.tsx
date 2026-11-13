import React from 'react';
import { Cpu, Layers, HardDrive, Network, Zap } from 'lucide-react';
import { HostMetricsSnapshot } from '../../types/metrics';

interface TelemetryPanelProps {
  telemetry: HostMetricsSnapshot | null;
  cadenceSeconds?: number;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry,
  cadenceSeconds = 5.0,
}) => {
  const formatRate = (bytesPerSec?: number) => {
    if (!bytesPerSec) return '0.0 KB/s';
    if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
    if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    return `${bytesPerSec.toFixed(0)} B/s`;
  };

  const toGB = (bytes?: number) => {
    if (!bytes) return '0.0';
    return (bytes / 1024 ** 3).toFixed(1);
  };

  return (
    <div className="rounded-2xl border border-obs-border bg-obs-panel shadow-panel p-5 font-mono text-xs">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-obs-border">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-obs-accent" />
          <span className="font-bold text-obs-text-primary uppercase tracking-wider">
            Host Telemetry Matrix
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-obs-text-secondary">
          <span className="h-2 w-2 rounded-full bg-obs-healthy animate-pulse" />
          <span>Cadence: {cadenceSeconds}s</span>
        </div>
      </div>

      {/* 4 Precision Readout Blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* CPU Tile */}
        <div className="rounded-xl border border-obs-border-subtle bg-obs-bg-secondary p-3.5 space-y-2">
          <div className="flex items-center justify-between text-obs-text-secondary">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-obs-accent" /> CPU Load
            </span>
            <span className="text-[11px]">{telemetry?.cpu.count_logical ?? 0} cores</span>
          </div>
          <div className="text-2xl font-bold font-mono text-obs-text-primary">
            {telemetry ? `${telemetry.cpu.overall_percent}%` : '--'}
          </div>
          <div className="h-1.5 w-full rounded-full bg-obs-surface overflow-hidden">
            <div
              className="h-full bg-obs-accent transition-all duration-500"
              style={{ width: `${telemetry?.cpu.overall_percent ?? 0}%` }}
            />
          </div>
        </div>

        {/* RAM Tile */}
        <div className="rounded-xl border border-obs-border-subtle bg-obs-bg-secondary p-3.5 space-y-2">
          <div className="flex items-center justify-between text-obs-text-secondary">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" /> Memory RSS
            </span>
            <span className="text-[11px]">{toGB(telemetry?.memory.total_bytes)} GB</span>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {telemetry ? `${telemetry.memory.percent}%` : '--'}
          </div>
          <div className="h-1.5 w-full rounded-full bg-obs-surface overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${telemetry?.memory.percent ?? 0}%` }}
            />
          </div>
        </div>

        {/* Storage Tile */}
        <div className="rounded-xl border border-obs-border-subtle bg-obs-bg-secondary p-3.5 space-y-2">
          <div className="flex items-center justify-between text-obs-text-secondary">
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-obs-warning" /> Disk Volume
            </span>
            <span className="text-[11px]">
              {telemetry?.disk.partitions.length ? telemetry.disk.partitions[0].mountpoint : '/'}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-obs-warning">
            {telemetry && telemetry.disk.partitions.length > 0
              ? `${telemetry.disk.partitions[0].percent}%`
              : '--'}
          </div>
          <div className="h-1.5 w-full rounded-full bg-obs-surface overflow-hidden">
            <div
              className="h-full bg-obs-warning transition-all duration-500"
              style={{
                width: `${
                  telemetry && telemetry.disk.partitions.length > 0
                    ? telemetry.disk.partitions[0].percent
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Network I/O Rate Tile */}
        <div className="rounded-xl border border-obs-border-subtle bg-obs-bg-secondary p-3.5 space-y-2">
          <div className="flex items-center justify-between text-obs-text-secondary">
            <span className="flex items-center gap-1.5">
              <Network className="h-3.5 w-3.5 text-obs-healthy" /> Net Throughput
            </span>
            <span className="text-[11px]">RX / TX</span>
          </div>
          <div className="text-sm font-bold font-mono text-obs-healthy truncate">
            ↓ {formatRate(telemetry?.network.bytes_recv_rate_per_sec)}
          </div>
          <div className="text-xs font-mono text-obs-accent truncate">
            ↑ {formatRate(telemetry?.network.bytes_sent_rate_per_sec)}
          </div>
        </div>
      </div>
    </div>
  );
};

