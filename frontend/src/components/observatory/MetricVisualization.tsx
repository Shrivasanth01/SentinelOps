import React, { useState, useId } from 'react';
import { Activity, Clock } from 'lucide-react';

export interface MetricDataPoint {
  timestamp: string; // ISO or HH:mm:ss
  value: number;
}

export interface MetricSeries {
  id: string;
  name: string;
  color?: string; // e.g. '#58A6FF', '#36D399', '#F5B942', '#FF5C67'
  unit?: string; // '%', 'MB/s', 'IOPS', 'ms'
  data: MetricDataPoint[];
}

interface MetricVisualizationProps {
  title: string;
  series: MetricSeries[];
  warningThreshold?: number;
  criticalThreshold?: number;
  timeRange?: '1m' | '5m' | '15m' | '1h';
  onTimeRangeChange?: (range: '1m' | '5m' | '15m' | '1h') => void;
  height?: number;
  showControls?: boolean;
  className?: string;
}

export const MetricVisualization: React.FC<MetricVisualizationProps> = ({
  title,
  series,
  warningThreshold,
  criticalThreshold,
  timeRange = '15m',
  onTimeRangeChange,
  height = 180,
  showControls = true,
  className = '',
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartId = useId();

  // Primary series is the first series
  const primarySeries = series[0];
  const points = primarySeries?.data || [];

  // Calculate min, max, average, and latest
  const values = points.map((p) => p.value);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 100;
  const latestVal = values.length ? values[values.length - 1] : 0;
  const avgVal = values.length
    ? values.reduce((acc, curr) => acc + curr, 0) / values.length
    : 0;

  // Chart coordinate math
  const paddingLeft = 36;
  const paddingRight = 16;
  const paddingTop = 14;
  const paddingBottom = 22;
  const chartWidth = 500; // viewBox units
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const yMax = Math.max(100, maxVal * 1.15, (criticalThreshold || 0) * 1.1);
  const yMin = 0;

  const getYCoord = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    return paddingTop + innerHeight - ((clamped - yMin) / (yMax - yMin)) * innerHeight;
  };

  const getXCoord = (index: number) => {
    if (points.length <= 1) return paddingLeft;
    return paddingLeft + (index / (points.length - 1)) * innerWidth;
  };

  // Generate SVG path for series
  const generatePath = (dataPoints: MetricDataPoint[]) => {
    if (dataPoints.length === 0) return '';
    return dataPoints.reduce((acc, pt, idx) => {
      const x = getXCoord(idx);
      const y = getYCoord(pt.value);
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  };

  const generateAreaPath = (dataPoints: MetricDataPoint[]) => {
    if (dataPoints.length === 0) return '';
    const linePath = generatePath(dataPoints);
    const startX = getXCoord(0);
    const endX = getXCoord(dataPoints.length - 1);
    const baseY = getYCoord(0);
    return `${linePath} L ${endX.toFixed(1)} ${baseY.toFixed(1)} L ${startX.toFixed(1)} ${baseY.toFixed(1)} Z`;
  };

  const hoveredPoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

  return (
    <div
      className={`rounded-lg border border-obs-border bg-obs-panel/90 backdrop-blur-sm p-4 relative flex flex-col font-mono text-obs-text-primary ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-obs-border/70">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-obs-accent" />
          <h4 className="text-xs uppercase font-semibold tracking-wider text-obs-text-primary">
            {title}
          </h4>
        </div>

        {/* Controls & Metrics callouts */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] text-obs-text-muted">
            <span>
              MIN: <span className="text-obs-text-primary">{minVal.toFixed(1)}{primarySeries?.unit || '%'}</span>
            </span>
            <span>
              AVG: <span className="text-obs-text-primary">{avgVal.toFixed(1)}{primarySeries?.unit || '%'}</span>
            </span>
            <span>
              PEAK: <span className="text-obs-text-primary">{maxVal.toFixed(1)}{primarySeries?.unit || '%'}</span>
            </span>
            <span className="font-semibold text-obs-accent">
              NOW: {latestVal.toFixed(1)}{primarySeries?.unit || '%'}
            </span>
          </div>

          {showControls && onTimeRangeChange && (
            <div className="flex items-center border border-obs-border rounded bg-obs-bg p-0.5 text-[10px]">
              {(['1m', '5m', '15m', '1h'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onTimeRangeChange(r)}
                  className={`px-1.5 py-0.5 rounded uppercase font-semibold transition-colors ${
                    timeRange === r
                      ? 'bg-obs-accent/20 text-obs-accent'
                      : 'text-obs-text-muted hover:text-obs-text-primary'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const normalizedX = (mouseX / rect.width) * chartWidth;
            if (normalizedX >= paddingLeft && normalizedX <= chartWidth - paddingRight && points.length > 1) {
              const fraction = (normalizedX - paddingLeft) / innerWidth;
              const idx = Math.round(fraction * (points.length - 1));
              setHoverIndex(Math.max(0, Math.min(points.length - 1, idx)));
            }
          }}
        >
          <defs>
            <linearGradient id={`gradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58A6FF" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#58A6FF" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`grid-glow-${chartId}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#243247" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#243247" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#243247" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Horizontal Technical Gridlines */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y = getYCoord((percent / 100) * yMax);
            return (
              <g key={percent}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#243247"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  strokeOpacity="0.6"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="8"
                  fill="#64748B"
                  className="font-mono"
                >
                  {Math.round((percent / 100) * yMax)}
                </text>
              </g>
            );
          })}

          {/* Warning Threshold Line */}
          {warningThreshold && warningThreshold <= yMax && (
            <g>
              <line
                x1={paddingLeft}
                y1={getYCoord(warningThreshold)}
                x2={chartWidth - paddingRight}
                y2={getYCoord(warningThreshold)}
                stroke="#F5B942"
                strokeWidth="1"
                strokeDasharray="4 2"
                strokeOpacity="0.75"
              />
              <text
                x={chartWidth - paddingRight + 4}
                y={getYCoord(warningThreshold) + 3}
                fill="#F5B942"
                fontSize="7"
                fontFamily="monospace"
              >
                WARN
              </text>
            </g>
          )}

          {/* Critical Threshold Line */}
          {criticalThreshold && criticalThreshold <= yMax && (
            <g>
              <line
                x1={paddingLeft}
                y1={getYCoord(criticalThreshold)}
                x2={chartWidth - paddingRight}
                y2={getYCoord(criticalThreshold)}
                stroke="#FF5C67"
                strokeWidth="1"
                strokeDasharray="4 2"
                strokeOpacity="0.85"
              />
              <text
                x={chartWidth - paddingRight + 4}
                y={getYCoord(criticalThreshold) + 3}
                fill="#FF5C67"
                fontSize="7"
                fontFamily="monospace"
              >
                CRIT
              </text>
            </g>
          )}

          {/* Series Area & Line */}
          {series.map((s) => {
            const sColor = s.color || '#58A6FF';
            return (
              <g key={s.id}>
                {/* Fill Area */}
                <path d={generateAreaPath(s.data)} fill={`url(#gradient-${chartId})`} />
                {/* Stroke Line */}
                <path
                  d={generatePath(s.data)}
                  fill="none"
                  stroke={sColor}
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}

          {/* Crosshair Cursor & Indicator when Hovering */}
          {hoveredPoint && hoverIndex !== null && (
            <g>
              <line
                x1={getXCoord(hoverIndex)}
                y1={paddingTop}
                x2={getXCoord(hoverIndex)}
                y2={chartHeight - paddingBottom}
                stroke="#58A6FF"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getXCoord(hoverIndex)}
                cy={getYCoord(hoveredPoint.value)}
                r="3.5"
                fill="#58A6FF"
                stroke="#080B12"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover Readout Tooltip Box */}
        {hoveredPoint && hoverIndex !== null && (
          <div
            className="absolute top-2 pointer-events-none px-2 py-1 rounded border border-obs-accent/40 bg-obs-panel/95 shadow-lg text-[10px] flex items-center gap-2 transform -translate-x-1/2"
            style={{
              left: `${(getXCoord(hoverIndex) / chartWidth) * 100}%`,
            }}
          >
            <Clock className="w-3 h-3 text-obs-accent" />
            <span className="text-obs-text-muted">{hoveredPoint.timestamp}</span>
            <span className="font-bold text-obs-text-primary">
              {hoveredPoint.value.toFixed(1)} {primarySeries?.unit || '%'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Axis / Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-obs-border/50 text-[10px] text-obs-text-muted">
        <div className="flex items-center gap-3">
          {series.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-1 rounded-sm"
                style={{ backgroundColor: s.color || '#58A6FF' }}
              />
              <span className="text-obs-text-secondary">{s.name}</span>
            </div>
          ))}
        </div>
        <div>
          <span>WINDOW: {timeRange.toUpperCase()}</span> &bull;{' '}
          <span>SAMPLES: {points.length}</span>
        </div>
      </div>
    </div>
  );
};
