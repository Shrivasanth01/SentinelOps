import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Info,
  Network,
  RefreshCw,
  Server,
  Terminal,
} from 'lucide-react';
import { usePrometheusMonitoring } from '../hooks/usePrometheusMonitoring';
import { MetricVisualization, MetricSeries } from '../components/observatory/MetricVisualization';

interface MonitoringPageProps {
  backendConnected?: boolean;
}

function formatBytes(bytes: number | null | undefined, decimals = 2): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatRate(bytesPerSec: number | null | undefined): string {
  if (bytesPerSec === null || bytesPerSec === undefined || isNaN(bytesPerSec)) return '—';
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatUptime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

export const MonitoringPage: React.FC<MonitoringPageProps> = ({
  backendConnected = true,
}) => {
  const {
    overview,
    history,
    isRefreshing,
    error,
    lastUpdated,
    duration,
    setDuration,
    refresh,
  } = usePrometheusMonitoring(3000, backendConnected);

  const targetState = overview?.health.target_status || 'UNKNOWN';
  const prometheusConnected = overview?.health.prometheus_connected ?? false;

  // Transform historical series for charts
  const getSeriesForMetric = (
    metricKey: string,
    defaultName: string,
    color: string,
    unit: string
  ): MetricSeries[] => {
    const s = history?.series.find((item) => item.metric === metricKey);
    return [
      {
        id: metricKey,
        name: s?.label || defaultName,
        color,
        unit: s?.unit || unit,
        data: (s?.points || []).map((pt) => ({
          timestamp: new Date(pt.timestamp * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          value: pt.value ?? 0,
        })),
      },
    ];
  };

  const cpuHistory = getSeriesForMetric('cpu', 'CPU Load', '#58A6FF', '%');
  const memoryHistory = getSeriesForMetric('memory', 'RAM Load', '#36D399', '%');
  const diskHistory = getSeriesForMetric('disk', 'Disk Usage', '#F5B942', '%');
  const networkHistory = getSeriesForMetric('network', 'Throughput', '#A371F7', 'B/s');

  const cpuPercent = overview?.cpu.overall_percent;
  const memoryPercent = overview?.memory.percent;

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* TOP COMMAND OBSERVATORY HEADER                                      */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#0D1420] border border-[#243247]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#111B29] border border-[#243247] text-[#58A6FF]">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-wider text-[#E8EEF7] uppercase font-mono">
                Host Infrastructure Telemetry Engine
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium tracking-wide bg-[#111B29] text-[#94A3B8] border border-[#243247]">
                PHASE 2
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
              Windows Exporter Telemetry • Native Host Scrape Port 9182 • Prometheus Core
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Target Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111B29] border border-[#243247]">
            <span
              className={`w-2 h-2 rounded-full ${
                targetState === 'UP'
                  ? 'bg-[#36D399] animate-pulse'
                  : targetState === 'DOWN'
                  ? 'bg-[#FF5C67]'
                  : 'bg-[#F5B942]'
              }`}
            />
            <span className="text-xs font-mono text-[#E8EEF7]">
              TARGET:{' '}
              <strong
                className={
                  targetState === 'UP'
                    ? 'text-[#36D399]'
                    : targetState === 'DOWN'
                    ? 'text-[#FF5C67]'
                    : 'text-[#F5B942]'
                }
              >
                {targetState}
              </strong>
            </span>
          </div>

          {/* Time range selector */}
          <div className="flex items-center bg-[#111B29] border border-[#243247] rounded-lg p-0.5">
            {(['5m', '15m', '1h', '6h'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDuration(r)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                  duration === r
                    ? 'bg-[#58A6FF]/20 text-[#58A6FF] font-semibold border border-[#58A6FF]/40'
                    : 'text-[#94A3B8] hover:text-[#E8EEF7]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Freshness Timestamp & Refresh Button */}
          <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
            <Clock className="w-3.5 h-3.5 text-[#58A6FF]" />
            <span>
              {lastUpdated
                ? lastUpdated.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '—'}
            </span>
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-[#111B29] border border-[#243247] hover:border-[#58A6FF]/50 text-[#94A3B8] hover:text-[#58A6FF] transition-all disabled:opacity-50"
              title="Manual Telemetry Poll"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#58A6FF]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* PROMETHEUS / TARGET DIAGNOSTIC ALERT (IF DEGRADED)                   */}
      {/* ==================================================================== */}
      {(!prometheusConnected || targetState !== 'UP' || error) && (
        <div className="p-4 rounded-xl bg-[#111B29] border border-[#F5B942]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#F5B942] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-[#E8EEF7] font-mono">
                {!prometheusConnected
                  ? 'PROMETHEUS TELEMETRY ENGINE DISCONNECTED'
                  : targetState === 'DOWN'
                  ? 'WINDOWS EXPORTER TARGET DOWN'
                  : 'TELEMETRY STATUS DEGRADED'}
              </h4>
              <p className="text-xs text-[#94A3B8] mt-1 font-mono">
                {!prometheusConnected
                  ? 'Prometheus server is unreachable on port 9090. Launch Prometheus container or local standalone engine.'
                  : targetState === 'DOWN'
                  ? 'Windows Exporter on port 9182 is not responding to scrape requests. Start the native exporter.'
                  : error || 'Gathering telemetry frames...'}
              </p>
              {overview?.health.reasons && overview.health.reasons.length > 0 && (
                <ul className="mt-2 text-xs font-mono text-[#F5B942] space-y-0.5 list-disc list-inside">
                  {overview.health.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#080B12] p-2 rounded-lg border border-[#243247] text-xs font-mono text-[#94A3B8]">
            <Terminal className="w-4 h-4 text-[#58A6FF]" />
            <span>.\scripts\start_windows_exporter.ps1</span>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PRIMARY METRICS SUMMARY STATS CARDS                                 */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <div className="p-4 rounded-xl bg-[#0D1420] border border-[#243247] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#58A6FF]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
                CPU Utilization
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                overview?.cpu.status === 'CRITICAL'
                  ? 'bg-[#FF5C67]/20 text-[#FF5C67] border border-[#FF5C67]/30'
                  : overview?.cpu.status === 'WARNING'
                  ? 'bg-[#F5B942]/20 text-[#F5B942] border border-[#F5B942]/30'
                  : 'bg-[#36D399]/20 text-[#36D399] border border-[#36D399]/30'
              }`}
            >
              {overview?.cpu.status || 'UNKNOWN'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-[#E8EEF7]">
              {cpuPercent !== null && cpuPercent !== undefined ? `${cpuPercent}%` : '—'}
            </span>
            <span className="text-xs text-[#94A3B8] font-mono">
              {overview?.cpu.core_count ? `${overview.cpu.core_count} Logical Cores` : ''}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#111B29] h-1.5 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                (cpuPercent || 0) > 90
                  ? 'bg-[#FF5C67]'
                  : (cpuPercent || 0) > 75
                  ? 'bg-[#F5B942]'
                  : 'bg-[#58A6FF]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, cpuPercent || 0))}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#243247] text-[11px] font-mono text-[#94A3B8]">
            <div>User: {overview?.cpu.user_percent !== null && overview?.cpu.user_percent !== undefined ? `${overview.cpu.user_percent}%` : '—'}</div>
            <div>Kernel: {overview?.cpu.system_percent !== null && overview?.cpu.system_percent !== undefined ? `${overview.cpu.system_percent}%` : '—'}</div>
          </div>
        </div>

        {/* Memory Card */}
        <div className="p-4 rounded-xl bg-[#0D1420] border border-[#243247] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#36D399]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
                Physical RAM
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                overview?.memory.status === 'CRITICAL'
                  ? 'bg-[#FF5C67]/20 text-[#FF5C67] border border-[#FF5C67]/30'
                  : overview?.memory.status === 'WARNING'
                  ? 'bg-[#F5B942]/20 text-[#F5B942] border border-[#F5B942]/30'
                  : 'bg-[#36D399]/20 text-[#36D399] border border-[#36D399]/30'
              }`}
            >
              {overview?.memory.status || 'UNKNOWN'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-[#E8EEF7]">
              {memoryPercent !== null && memoryPercent !== undefined ? `${memoryPercent}%` : '—'}
            </span>
            <span className="text-xs text-[#94A3B8] font-mono">
              {formatBytes(overview?.memory.used_bytes)} / {formatBytes(overview?.memory.total_bytes)}
            </span>
          </div>

          <div className="w-full bg-[#111B29] h-1.5 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full transition-all duration-500 ${
                (memoryPercent || 0) > 92
                  ? 'bg-[#FF5C67]'
                  : (memoryPercent || 0) > 80
                  ? 'bg-[#F5B942]'
                  : 'bg-[#36D399]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, memoryPercent || 0))}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#243247] text-[11px] font-mono text-[#94A3B8]">
            <div>Free: {formatBytes(overview?.memory.free_bytes)}</div>
            <div>Limit: {formatBytes(overview?.memory.commit_limit_bytes)}</div>
          </div>
        </div>

        {/* Disk Card */}
        <div className="p-4 rounded-xl bg-[#0D1420] border border-[#243247] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#F5B942]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
                Disk Storage
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                overview?.disk.status === 'CRITICAL'
                  ? 'bg-[#FF5C67]/20 text-[#FF5C67] border border-[#FF5C67]/30'
                  : overview?.disk.status === 'WARNING'
                  ? 'bg-[#F5B942]/20 text-[#F5B942] border border-[#F5B942]/30'
                  : 'bg-[#36D399]/20 text-[#36D399] border border-[#36D399]/30'
              }`}
            >
              {overview?.disk.status || 'UNKNOWN'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold font-mono text-[#E8EEF7]">
              {overview?.disk.volumes?.[0]?.percent !== undefined &&
              overview?.disk.volumes?.[0]?.percent !== null
                ? `${overview.disk.volumes[0].percent}%`
                : '—'}
            </span>
            <span className="text-xs text-[#94A3B8] font-mono">
              Vol {overview?.disk.volumes?.[0]?.volume || 'C:'}
            </span>
          </div>

          <div className="w-full bg-[#111B29] h-1.5 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-[#F5B942] transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, overview?.disk.volumes?.[0]?.percent || 0)
                )}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#243247] text-[11px] font-mono text-[#94A3B8]">
            <div>Read: {formatRate(overview?.disk.total_read_bytes_per_sec)}</div>
            <div>Write: {formatRate(overview?.disk.total_write_bytes_per_sec)}</div>
          </div>
        </div>

        {/* Network Card */}
        <div className="p-4 rounded-xl bg-[#0D1420] border border-[#243247] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-[#A371F7]" />
              <span className="text-xs font-mono uppercase tracking-wider text-[#94A3B8]">
                Network Throughput
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-[#36D399]/20 text-[#36D399] border border-[#36D399]/30">
              ACTIVE
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl font-bold font-mono text-[#E8EEF7]">
              {formatRate(overview?.network.rx_bytes_per_sec)}
            </span>
            <span className="text-xs text-[#94A3B8] font-mono">Total Rx</span>
          </div>

          <div className="w-full bg-[#111B29] h-1.5 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-[#A371F7] w-1/3 transition-all duration-500" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#243247] text-[11px] font-mono text-[#94A3B8]">
            <div className="flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3 text-[#36D399]" />
              <span>Rx: {formatRate(overview?.network.rx_bytes_per_sec)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-[#58A6FF]" />
              <span>Tx: {formatRate(overview?.network.tx_bytes_per_sec)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* DETAILED HOST TELEMETRY TABS & PANELS                                */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Core Breakdown & Partitions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Per-Core CPU Breakdown */}
          <div className="p-4 rounded-xl bg-[#0D1420] border border-[#243247]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#58A6FF]" />
                <h3 className="text-sm font-semibold font-mono text-[#E8EEF7] uppercase tracking-wider">
                  Logical Core Telemetry Matrix
                </h3>
              </div>
              <span className="text-xs font-mono text-[#94A3B8]">
                {overview?.cpu.cores.length || 0} Cores Detected
              </span>
            </div>

            {overview?.cpu.cores && overview.cpu.cores.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {overview.cpu.cores.map((corePct, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-[#111B29] border border-[#243247] flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8] mb-1">
                      <span>C{idx}</span>
                      <span className="text-[#E8EEF7] font-semibold">{corePct}%</span>
                    </div>
                    <div className="w-full bg-[#080B12] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          corePct > 90
                            ? 'bg-[#FF5C67]'
                            : corePct > 75
                            ? 'bg-[#F5B942]'
                            : 'bg-[#58A6FF]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, corePct))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs font-mono text-[#94A3B8]">
                Per-core metric samples registering from Windows Exporter...
              </div>
            )}
          </div>

          {/* Logical Disk Partitions */}
          <div className="p-4 rounded-xl bg-[#0D1420] border border-[#243247]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#F5B942]" />
                <h3 className="text-sm font-semibold font-mono text-[#E8EEF7] uppercase tracking-wider">
                  Logical Volumes & Partitions
                </h3>
              </div>
              <span className="text-xs font-mono text-[#94A3B8]">
                {overview?.disk.volumes.length || 0} Mounted Volumes
              </span>
            </div>

            <div className="space-y-3">
              {overview?.disk.volumes && overview.disk.volumes.length > 0 ? (
                overview.disk.volumes.map((vol) => (
                  <div
                    key={vol.volume}
                    className="p-3 rounded-lg bg-[#111B29] border border-[#243247]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-[#E8EEF7]">
                          Drive {vol.volume}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                            vol.status === 'CRITICAL'
                              ? 'bg-[#FF5C67]/20 text-[#FF5C67]'
                              : vol.status === 'WARNING'
                              ? 'bg-[#F5B942]/20 text-[#F5B942]'
                              : 'bg-[#36D399]/20 text-[#36D399]'
                          }`}
                        >
                          {vol.status}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-[#94A3B8]">
                        <span className="text-[#E8EEF7] font-semibold">{vol.percent ?? '—'}%</span>{' '}
                        ({formatBytes(vol.used_bytes)} / {formatBytes(vol.total_bytes)})
                      </div>
                    </div>

                    <div className="w-full bg-[#080B12] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          (vol.percent || 0) > 95
                            ? 'bg-[#FF5C67]'
                            : (vol.percent || 0) > 85
                            ? 'bg-[#F5B942]'
                            : 'bg-[#58A6FF]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, vol.percent || 0))}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex justify-between text-[11px] font-mono text-[#94A3B8]">
                      <span>Free Space: {formatBytes(vol.free_bytes)}</span>
                      <span>Total Capacity: {formatBytes(vol.total_bytes)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs font-mono text-[#94A3B8]">
                  No logical partitions registered yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): System Info & Prometheus Scrape Targets */}
        <div className="space-y-6">
          {/* Monitored Host Metadata */}
          <div className="p-4 rounded-xl bg-[#0D1420] border border-[#243247]">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[#58A6FF]" />
              <h3 className="text-sm font-semibold font-mono text-[#E8EEF7] uppercase tracking-wider">
                Monitored Node Telemetry
              </h3>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-[#243247]">
                <span className="text-[#94A3B8]">Hostname</span>
                <span className="text-[#E8EEF7] font-semibold">{overview?.system.hostname || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#243247]">
                <span className="text-[#94A3B8]">Operating System</span>
                <span className="text-[#E8EEF7]">{overview?.system.os_name || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#243247]">
                <span className="text-[#94A3B8]">OS Version / Build</span>
                <span className="text-[#E8EEF7]">{overview?.system.os_version || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#243247]">
                <span className="text-[#94A3B8]">System Uptime</span>
                <span className="text-[#36D399] font-semibold">
                  {formatUptime(overview?.system.uptime_seconds)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#243247]">
                <span className="text-[#94A3B8]">Active Processes</span>
                <span className="text-[#58A6FF] font-semibold">
                  {overview?.system.process_count ?? '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#94A3B8]">Telemetry Protocol</span>
                <span className="text-[#E8EEF7]">Prometheus HTTP v1</span>
              </div>
            </div>
          </div>

          {/* Prometheus Scrape Targets */}
          <div className="p-4 rounded-xl bg-[#0D1420] border border-[#243247]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#36D399]" />
                <h3 className="text-sm font-semibold font-mono text-[#E8EEF7] uppercase tracking-wider">
                  Scrape Targets ({overview?.targets.length || 0})
                </h3>
              </div>
            </div>

            <div className="space-y-2.5">
              {overview?.targets && overview.targets.length > 0 ? (
                overview.targets.map((tgt, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-[#111B29] border border-[#243247] text-xs font-mono"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#E8EEF7] font-semibold">{tgt.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          tgt.health === 'UP'
                            ? 'bg-[#36D399]/20 text-[#36D399] border border-[#36D399]/30'
                            : 'bg-[#FF5C67]/20 text-[#FF5C67] border border-[#FF5C67]/30'
                        }`}
                      >
                        {tgt.health}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8] truncate mb-1">
                      {tgt.url}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#94A3B8]">
                      <span>Latency: {tgt.scrape_duration_ms ? `${tgt.scrape_duration_ms} ms` : '—'}</span>
                      <span>
                        {tgt.last_scraped_at
                          ? new Date(tgt.last_scraped_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : '—'}
                      </span>
                    </div>
                    {tgt.last_error && (
                      <div className="mt-1 text-[10px] text-[#FF5C67] truncate">
                        Error: {tgt.last_error}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs font-mono text-[#94A3B8]">
                  No active targets reported by Prometheus.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* HISTORICAL TELEMETRY WAVEFORMS                                       */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricVisualization
          title="CPU Utilization Waveform"
          series={cpuHistory}
          warningThreshold={75}
          criticalThreshold={90}
          timeRange={duration as '5m' | '15m' | '1h'}
          height={190}
        />

        <MetricVisualization
          title="RAM Utilization Waveform"
          series={memoryHistory}
          warningThreshold={80}
          criticalThreshold={92}
          timeRange={duration as '5m' | '15m' | '1h'}
          height={190}
        />

        <MetricVisualization
          title="Disk Space Waveform"
          series={diskHistory}
          warningThreshold={85}
          criticalThreshold={95}
          timeRange={duration as '5m' | '15m' | '1h'}
          height={190}
        />

        <MetricVisualization
          title="Network Aggregate Throughput Waveform"
          series={networkHistory}
          timeRange={duration as '5m' | '15m' | '1h'}
          height={190}
        />
      </div>
    </div>
  );
};
