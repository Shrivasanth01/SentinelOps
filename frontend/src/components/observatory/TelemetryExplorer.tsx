import React, { useState } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { useHistoricalTelemetry, TelemetrySubsystem } from '../../hooks/useHistoricalTelemetry';
import { TimeRange } from '../../types/analytics';

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '15M', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '6H', value: '6h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
];

const SUBSYSTEMS: { id: TelemetrySubsystem; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'cpu', label: 'CPU COMPUTE', icon: Cpu },
  { id: 'memory', label: 'PHYSICAL RAM', icon: Activity },
  { id: 'disk', label: 'LOGICAL DISK', icon: HardDrive },
  { id: 'network', label: 'NETWORK I/O', icon: Network },
];

export const TelemetryExplorer: React.FC = () => {
  const {
    subsystem,
    setSubsystem,
    timeRange,
    setTimeRange,
    data,
    isLoading,
    error,
    lastRefreshed,
    refresh,
  } = useHistoricalTelemetry('cpu', '15m');

  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; ts: number } | null>(null);

  const stats = data?.stats;
  const points = data?.points || [];
  const unit = data?.unit || '';

  // Calculate SVG waveform coordinates
  const validPoints = points.filter((p) => p.value !== null && p.value !== undefined);
  const minVal = stats?.min ?? (validPoints.length ? Math.min(...validPoints.map((p) => p.value!)) : 0);
  const maxVal = stats?.max ?? (validPoints.length ? Math.max(...validPoints.map((p) => p.value!)) : 100);
  const rangeSpan = maxVal - minVal || 1;

  const width = 850;
  const height = 220;
  const paddingX = 40;
  const paddingY = 25;

  const plotPoints = validPoints.map((pt, idx) => {
    const x = paddingX + (idx / Math.max(1, validPoints.length - 1)) * (width - paddingX * 2);
    const normalizedY = (pt.value! - minVal) / rangeSpan;
    const y = height - paddingY - normalizedY * (height - paddingY * 2);
    return { x, y, val: pt.value!, ts: pt.timestamp };
  });

  const pathD = plotPoints.reduce((acc, pt, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const areaD = plotPoints.length > 0
    ? `${pathD} L ${plotPoints[plotPoints.length - 1].x.toFixed(1)} ${height - paddingY} L ${plotPoints[0].x.toFixed(1)} ${height - paddingY} Z`
    : '';

  // Trend formatting
  const getTrendIcon = () => {
    if (!stats) return <Minus className="w-3.5 h-3.5 text-obs-text-muted" />;
    switch (stats.trend) {
      case 'SURGING':
      case 'INCREASING':
        return <TrendingUp className="w-3.5 h-3.5 text-obs-critical" />;
      case 'DECREASING':
        return <TrendingDown className="w-3.5 h-3.5 text-obs-healthy" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-obs-accent" />;
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Control Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/90 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          {SUBSYSTEMS.map((sub) => {
            const Icon = sub.icon;
            const isActive = subsystem === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSubsystem(sub.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold tracking-wider transition-all border ${
                  isActive
                    ? 'border-obs-accent bg-obs-accent/20 text-obs-accent shadow-[0_0_12px_rgba(88,166,255,0.2)]'
                    : 'border-obs-border bg-obs-bg/60 text-obs-text-muted hover:text-obs-text hover:border-obs-border/90'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 self-end lg:self-auto">
          {/* Time range selectors */}
          <div className="flex items-center rounded border border-obs-border bg-obs-bg/80 p-0.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setTimeRange(r.value)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                  timeRange === r.value
                    ? 'bg-obs-accent/30 text-obs-accent border border-obs-accent/50'
                    : 'text-obs-text-muted hover:text-obs-text'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-obs-border rounded bg-obs-bg/60 text-obs-text-muted hover:text-obs-text hover:border-obs-accent transition-colors disabled:opacity-50"
            title="Refresh Historical Range"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-obs-accent' : ''}`} />
            <span className="hidden sm:inline">REFRESH</span>
          </button>
        </div>
      </div>

      {/* Statistical Summary Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Current Live</div>
          <div className="mt-1 text-lg font-bold text-obs-text flex items-baseline gap-1">
            <span>{stats?.current_value !== null && stats?.current_value !== undefined ? stats.current_value.toFixed(1) : '--'}</span>
            <span className="text-[10px] text-obs-text-muted">{unit}</span>
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-obs-healthy animate-pulse" />
            <span>REAL-TIME STREAM</span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Historical Mean (μ)</div>
          <div className="mt-1 text-lg font-bold text-obs-accent flex items-baseline gap-1">
            <span>{stats?.mean !== null && stats?.mean !== undefined ? stats.mean.toFixed(1) : '--'}</span>
            <span className="text-[10px] text-obs-text-muted">{unit}</span>
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">σ = {stats?.standard_deviation?.toFixed(2) ?? '--'}</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Window Median</div>
          <div className="mt-1 text-lg font-bold text-obs-text flex items-baseline gap-1">
            <span>{stats?.median !== null && stats?.median !== undefined ? stats.median.toFixed(1) : '--'}</span>
            <span className="text-[10px] text-obs-text-muted">{unit}</span>
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">50th percentile</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Floor (Min)</div>
          <div className="mt-1 text-lg font-bold text-obs-healthy flex items-baseline gap-1">
            <span>{stats?.min !== null && stats?.min !== undefined ? stats.min.toFixed(1) : '--'}</span>
            <span className="text-[10px] text-obs-text-muted">{unit}</span>
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Window minimum</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Peak (Max)</div>
          <div className="mt-1 text-lg font-bold text-obs-warning flex items-baseline gap-1">
            <span>{stats?.max !== null && stats?.max !== undefined ? stats.max.toFixed(1) : '--'}</span>
            <span className="text-[10px] text-obs-text-muted">{unit}</span>
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Window ceiling</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Trend Trajectory</div>
          <div className="mt-1 text-lg font-bold text-obs-text flex items-center gap-1.5">
            {getTrendIcon()}
            <span className="text-sm font-semibold">{stats?.trend ?? 'STABLE'}</span>
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">
            Δ {stats?.rate_of_change_percent !== null && stats?.rate_of_change_percent !== undefined ? `${stats.rate_of_change_percent > 0 ? '+' : ''}${stats.rate_of_change_percent.toFixed(1)}%` : '0.0%'}
          </div>
        </div>
      </div>

      {/* Main High-Density Waveform Canvas */}
      <div className="p-4 rounded-lg border border-obs-border bg-obs-panel/95 relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-obs-border/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-obs-text tracking-wider uppercase">
              {subsystem.toUpperCase()} TELEMETRY WAVEFORM
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-obs-bg border border-obs-border text-obs-text-muted">
              RANGE: {timeRange} | STEP: {data?.step ?? '15s'} | SAMPLES: {validPoints.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-obs-text-muted">
            <Clock className="w-3 h-3 text-obs-text-muted" />
            <span>LAST SYNC: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>

        {error ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-obs-critical">
            <AlertCircle className="w-8 h-8 mb-2" />
            <div className="text-sm font-bold">Telemetry Query Failure</div>
            <div className="text-xs text-obs-text-muted max-w-md mt-1">{error}</div>
          </div>
        ) : validPoints.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center text-obs-text-muted">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <div className="text-sm">No historical telemetry points recorded in Prometheus for this time range.</div>
            <div className="text-xs mt-1 text-obs-text-muted/70">Wait for collection cycles or switch time range.</div>
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-56 select-none overflow-visible"
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <defs>
                <linearGradient id="telemetryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#58A6FF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#58A6FF" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#243247" strokeDasharray="3 3" />
              <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#243247" strokeDasharray="3 3" />
              <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#243247" />

              {/* Reference mean line */}
              {stats?.mean !== undefined && stats.mean !== null && (
                <line
                  x1={paddingX}
                  y1={height - paddingY - ((stats.mean - minVal) / rangeSpan) * (height - paddingY * 2)}
                  x2={width - paddingX}
                  y2={height - paddingY - ((stats.mean - minVal) / rangeSpan) * (height - paddingY * 2)}
                  stroke="#36D399"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
              )}

              {/* Area & Line */}
              <path d={areaD} fill="url(#telemetryGrad)" />
              <path d={pathD} fill="none" stroke="#58A6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Interactive Hover Indicators */}
              {plotPoints.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  className="fill-transparent hover:fill-obs-accent cursor-pointer transition-colors"
                  onMouseEnter={() => setHoveredPoint(pt)}
                />
              ))}

              {hoveredPoint && (
                <g>
                  <line
                    x1={hoveredPoint.x}
                    y1={paddingY}
                    x2={hoveredPoint.x}
                    y2={height - paddingY}
                    stroke="#58A6FF"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" fill="#58A6FF" stroke="#080B12" strokeWidth="2" />
                </g>
              )}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className="absolute z-10 px-2 py-1 rounded bg-obs-bg-secondary border border-obs-border shadow-xl text-[10px] pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2"
                style={{
                  left: `${(hoveredPoint.x / width) * 100}%`,
                  top: `${(hoveredPoint.y / height) * 100}%`,
                }}
              >
                <div className="text-obs-accent font-bold">
                  {hoveredPoint.val.toFixed(2)} {unit}
                </div>
                <div className="text-obs-text-muted">
                  {new Date(hoveredPoint.ts * 1000).toLocaleTimeString()}
                </div>
              </div>
            )}

            {/* Axis Labels */}
            <div className="flex justify-between text-[9px] text-obs-text-muted pt-2 px-2 border-t border-obs-border/40">
              <span>{new Date((stats?.min ? points[0]?.timestamp : Date.now() / 1000 - 900) * 1000).toLocaleTimeString()}</span>
              <span>PEAK: {maxVal.toFixed(1)} {unit} | FLOOR: {minVal.toFixed(1)} {unit}</span>
              <span>{new Date(Date.now()).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Multi-series Breakdown Details if available */}
      {data?.breakdown && Object.keys(data.breakdown).length > 0 && (
        <div className="p-4 rounded-lg border border-obs-border bg-obs-panel/80">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-obs-accent" />
            <h3 className="text-xs font-semibold tracking-wider uppercase text-obs-text">
              Multi-Series Subsystem Breakdown
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {Object.entries(data.breakdown).map(([k, seriesPoints]) => {
              const lastPt = seriesPoints[seriesPoints.length - 1];
              return (
                <div key={k} className="p-2.5 rounded border border-obs-border bg-obs-bg/60 flex items-center justify-between">
                  <span className="text-xs text-obs-text-muted truncate max-w-[200px]" title={k}>
                    {k}
                  </span>
                  <span className="text-xs font-bold text-obs-text">
                    {lastPt?.value !== null && lastPt?.value !== undefined ? `${lastPt.value.toFixed(1)} ${unit}` : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
