import React from 'react';
import {
  Server,
  Cpu,
  HardDrive,
  Network,
  Layers,
} from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';
import { InfrastructureTopology } from '../components/observatory/InfrastructureTopology';

export const InfrastructurePage: React.FC = () => {
  const { current } = useMetrics(4000, true);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatRate = (rate?: number) => {
    if (!rate) return '0 B/s';
    if (rate >= 1024 * 1024) return `${(rate / (1024 * 1024)).toFixed(2)} MB/s`;
    if (rate >= 1024) return `${(rate / 1024).toFixed(1)} KB/s`;
    return `${rate.toFixed(0)} B/s`;
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const primaryDisk = current?.disk.partitions?.[0];

  return (
    <div className="space-y-4 font-mono">
      {/* Top Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text-primary">
                Infrastructure Topology Workspace
              </h1>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-obs-healthy/15 border border-obs-healthy/30 text-obs-healthy">
                FLEET ONLINE
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              Interactive multi-tier service mesh, real-time signal links, and host hardware telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded border border-obs-border bg-obs-bg text-obs-text-secondary text-[11px]">
            HOST: <span className="text-obs-text-primary font-bold">{current?.host_name || 'localhost'}</span>
          </div>
          <div className="px-2.5 py-1 rounded border border-obs-border bg-obs-bg text-obs-text-secondary text-[11px]">
            UPTIME: <span className="text-obs-accent">{formatUptime(current?.system.uptime_seconds)}</span>
          </div>
        </div>
      </div>

      {/* Main Centerpiece: Visual Topology Canvas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-obs-text-primary">
            <Layers className="w-3.5 h-3.5 text-obs-accent" />
            <span>Interactive Multi-Tier Mesh</span>
          </div>
          <span className="text-[10px] text-obs-text-muted">
            Drag to pan &bull; Scroll to zoom &bull; Click node to inspect details
          </span>
        </div>
        <InfrastructureTopology />
      </div>

      {/* Hardware Subsystem Telemetry Matrix */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-obs-text-primary">
          <Cpu className="w-3.5 h-3.5 text-obs-accent" />
          <span>Host Hardware & Controller Matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Processor Hardware */}
          <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
              <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
                <Cpu className="w-3.5 h-3.5 text-obs-accent" />
                Processor Topology
              </span>
              <span className="text-[10px] text-obs-healthy">ONLINE</span>
            </div>
            <div className="space-y-1.5 text-xs text-obs-text-secondary">
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Logical Cores:</span>
                <span className="text-obs-text-primary font-bold">{current?.cpu.count_logical ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Physical Sockets:</span>
                <span className="text-obs-text-primary">{current?.cpu.count_physical ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Active Utilization:</span>
                <span className="text-obs-accent font-semibold">{current?.cpu.overall_percent ?? 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Process Scheduler:</span>
                <span className="text-obs-text-primary">{current?.system.process_count ?? 0} tasks</span>
              </div>
            </div>
          </div>

          {/* Memory Controller */}
          <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
              <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
                <HardDrive className="w-3.5 h-3.5 text-obs-accent" />
                Memory Controller
              </span>
              <span className="text-[10px] text-obs-healthy">SYNCED</span>
            </div>
            <div className="space-y-1.5 text-xs text-obs-text-secondary">
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Total Installed:</span>
                <span className="text-obs-text-primary font-bold">{formatBytes(current?.memory.total_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Allocated RSS:</span>
                <span className="text-obs-text-primary">{formatBytes(current?.memory.used_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Available Free:</span>
                <span className="text-obs-healthy">{formatBytes(current?.memory.available_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Memory Load:</span>
                <span className="text-obs-accent font-semibold">{current?.memory.percent ?? 0}%</span>
              </div>
            </div>
          </div>

          {/* Storage Volume */}
          <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
              <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
                <HardDrive className="w-3.5 h-3.5 text-obs-accent" />
                Root Volume
              </span>
              <span className="text-[10px] text-obs-healthy">MOUNTED</span>
            </div>
            <div className="space-y-1.5 text-xs text-obs-text-secondary">
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Total Capacity:</span>
                <span className="text-obs-text-primary font-bold">{formatBytes(primaryDisk?.total_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Allocated Blocks:</span>
                <span className="text-obs-text-primary">{formatBytes(primaryDisk?.used_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Available Blocks:</span>
                <span className="text-obs-healthy">{formatBytes(primaryDisk?.free_bytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Volume Pressure:</span>
                <span className="text-obs-accent font-semibold">{primaryDisk?.percent ?? 0}%</span>
              </div>
            </div>
          </div>

          {/* Network Controller */}
          <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
              <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
                <Network className="w-3.5 h-3.5 text-obs-accent" />
                Network Interfaces
              </span>
              <span className="text-[10px] text-obs-healthy">TRANSMITTING</span>
            </div>
            <div className="space-y-1.5 text-xs text-obs-text-secondary">
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Ingress Rate:</span>
                <span className="text-obs-healthy font-semibold">{formatRate(current?.network.bytes_recv_rate_per_sec)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Egress Rate:</span>
                <span className="text-obs-accent font-semibold">{formatRate(current?.network.bytes_sent_rate_per_sec)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Cumulative RX:</span>
                <span className="text-obs-text-primary">{formatBytes(current?.network.total_bytes_recv)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-obs-text-muted">Cumulative TX:</span>
                <span className="text-obs-text-primary">{formatBytes(current?.network.total_bytes_sent)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
