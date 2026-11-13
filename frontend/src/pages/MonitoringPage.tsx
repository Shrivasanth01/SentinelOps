import React, { useState } from 'react';
import {
  RefreshCw,
  Activity,
  Clock,
  Cpu,
  HardDrive,
  Network,
  AlertCircle,
  Database,
} from 'lucide-react';
import { useMetrics } from '../hooks/useMetrics';
import { MetricVisualization, MetricSeries } from '../components/observatory/MetricVisualization';

interface MonitoringPageProps {
  backendConnected?: boolean;
}

export const MonitoringPage: React.FC<MonitoringPageProps> = ({
  backendConnected = true,
}) => {
  const { current, history, summary, isRefreshing, lastUpdated, refresh, error } =
    useMetrics(3000, backendConnected);
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m' | '1h'>('15m');

  const primaryDisk = current?.disk.partitions?.[0];

  // Map snapshots to MetricSeries
  const cpuSeries: MetricSeries[] = [
    {
      id: 'cpu-usage',
      name: 'CPU Active Load',
      color: '#58A6FF',
      unit: '%',
      data: (history?.snapshots || []).map((s) => ({
        timestamp: new Date(s.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        value: s.cpu.overall_percent,
      })),
    },
  ];

  const memSeries: MetricSeries[] = [
    {
      id: 'mem-usage',
      name: 'Memory RSS Load',
      color: '#36D399',
      unit: '%',
      data: (history?.snapshots || []).map((s) => ({
        timestamp: new Date(s.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        value: s.memory.percent,
      })),
    },
  ];

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

  return (
    <div className="space-y-4 font-mono">
      {/* Top Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text-primary">
                Live Telemetry Workbench
              </h1>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-obs-accent/15 border border-obs-accent/30 text-obs-accent">
                240 RING BUFFER
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              High-frequency multi-gauge hardware telemetry sampled by background worker
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-obs-text-muted">
            <Clock className="w-3.5 h-3.5 text-obs-accent" />
            <span>{lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--:--'}</span>
          </div>

          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-obs-accent/40 bg-obs-accent/10 hover:bg-obs-accent/20 text-obs-accent text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sample Now</span>
          </button>
        </div>
      </div>

      {!backendConnected && (
        <div className="p-3 rounded border border-obs-critical/40 bg-obs-critical/10 text-xs text-obs-critical flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>FastAPI Gateway Offline &mdash; Telemetry collection paused. Ensure backend is running at http://127.0.0.1:8000.</span>
          </div>
          <button
            onClick={refresh}
            className="px-2 py-1 rounded border border-obs-critical/50 hover:bg-obs-critical/20 font-semibold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {backendConnected && error && (
        <div className="p-3 rounded border border-obs-critical/40 bg-obs-critical/10 text-xs text-obs-critical flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Telemetry Stream Disrupted: {error}</span>
        </div>
      )}

      {/* KPI Stream Strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/80 space-y-1">
            <div className="text-[10px] uppercase text-obs-text-muted">CPU Rolling Average</div>
            <div className="text-xl font-bold text-obs-accent">{summary.cpu_percent_avg}%</div>
            <div className="text-[10px] text-obs-text-muted">
              Peak: {summary.cpu_percent_max}% &bull; Low: {summary.cpu_percent_min}%
            </div>
          </div>

          <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/80 space-y-1">
            <div className="text-[10px] uppercase text-obs-text-muted">Memory Rolling Average</div>
            <div className="text-xl font-bold text-obs-healthy">{summary.memory_percent_avg}%</div>
            <div className="text-[10px] text-obs-text-muted">
              Peak: {summary.memory_percent_max}% &bull; Low: {summary.memory_percent_min}%
            </div>
          </div>

          <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/80 space-y-1">
            <div className="text-[10px] uppercase text-obs-text-muted">Disk Capacity Pressure</div>
            <div className="text-xl font-bold text-obs-warning">{summary.disk_percent_avg}%</div>
            <div className="text-[10px] text-obs-text-muted">
              Active buffer: {summary.sample_count} frames
            </div>
          </div>

          <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/80 space-y-1">
            <div className="text-[10px] uppercase text-obs-text-muted">Prometheus Exporter</div>
            <div className="text-xl font-bold text-obs-healthy flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-obs-healthy animate-pulse" />
              <span>ACTIVE</span>
            </div>
            <div className="text-[10px] text-obs-text-muted">Port 8000 /metrics</div>
          </div>
        </div>
      )}

      {/* Time-Series Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CPU Telemetry Time Series */}
        <MetricVisualization
          title="CPU Utilization Waveform"
          series={cpuSeries}
          warningThreshold={75}
          criticalThreshold={90}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          height={190}
        />

        {/* Memory Telemetry Time Series */}
        <MetricVisualization
          title="Memory Allocation Profile"
          series={memSeries}
          warningThreshold={80}
          criticalThreshold={95}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          height={190}
        />
      </div>

      {/* High-Density Host Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {/* Real-time CPU Cores */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
            <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
              <Cpu className="w-3.5 h-3.5 text-obs-accent" />
              Processor Cores
            </span>
            <span className="text-[10px] text-obs-accent">
              {current?.cpu.count_logical ?? 0} LOGICAL
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-obs-text-secondary">
            <div className="flex justify-between">
              <span className="text-obs-text-muted">Overall Load:</span>
              <span className="text-obs-accent font-semibold">{current?.cpu.overall_percent ?? 0}%</span>
            </div>
            <div className="w-full bg-obs-bg rounded h-1.5 overflow-hidden">
              <div
                className="bg-obs-accent h-full transition-all duration-300"
                style={{ width: `${current?.cpu.overall_percent ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-obs-text-muted">Physical Sockets:</span>
              <span className="text-obs-text-primary">{current?.cpu.count_physical ?? 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Real-time Memory RSS */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
            <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
              <HardDrive className="w-3.5 h-3.5 text-obs-healthy" />
              Memory Breakdown
            </span>
            <span className="text-[10px] text-obs-healthy">
              {current?.memory.percent ?? 0}% USED
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-obs-text-secondary">
            <div className="flex justify-between">
              <span className="text-obs-text-muted">Total:</span>
              <span className="text-obs-text-primary">{formatBytes(current?.memory.total_bytes)}</span>
            </div>
            <div className="w-full bg-obs-bg rounded h-1.5 overflow-hidden">
              <div
                className="bg-obs-healthy h-full transition-all duration-300"
                style={{ width: `${current?.memory.percent ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-obs-text-muted">Available Free:</span>
              <span className="text-obs-healthy">{formatBytes(current?.memory.available_bytes)}</span>
            </div>
          </div>
        </div>

        {/* Real-time Disk Storage */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
            <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
              <Database className="w-3.5 h-3.5 text-obs-warning" />
              Disk Volume Mount
            </span>
            <span className="text-[10px] text-obs-warning">
              {primaryDisk?.percent ?? 0}% FULL
            </span>
          </div>
          <div className="space-y-1.5 text-xs text-obs-text-secondary">
            <div className="flex justify-between">
              <span className="text-obs-text-muted">Volume Size:</span>
              <span className="text-obs-text-primary">{formatBytes(primaryDisk?.total_bytes)}</span>
            </div>
            <div className="w-full bg-obs-bg rounded h-1.5 overflow-hidden">
              <div
                className="bg-obs-warning h-full transition-all duration-300"
                style={{ width: `${primaryDisk?.percent ?? 0}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-obs-text-muted">Available Blocks:</span>
              <span className="text-obs-healthy">{formatBytes(primaryDisk?.free_bytes)}</span>
            </div>
          </div>
        </div>

        {/* Real-time Network Throughput */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
            <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
              <Network className="w-3.5 h-3.5 text-obs-accent" />
              Network I/O Rate
            </span>
            <span className="text-[10px] text-obs-accent">ACTIVE</span>
          </div>
          <div className="space-y-1.5 text-xs text-obs-text-secondary">
            <div className="flex justify-between">
              <span className="text-obs-text-muted">Ingress RX:</span>
              <span className="text-obs-healthy font-semibold">{formatRate(current?.network.bytes_recv_rate_per_sec)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obs-text-muted">Egress TX:</span>
              <span className="text-obs-accent font-semibold">{formatRate(current?.network.bytes_sent_rate_per_sec)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-obs-text-muted">Cumul Ingress:</span>
              <span className="text-obs-text-primary">{formatBytes(current?.network.total_bytes_recv)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
