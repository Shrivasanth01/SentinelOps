import React from 'react';

interface DataPoint {
  time: string;
  value: number;
}

interface TimeSeriesChartProps {
  data: DataPoint[];
  title: string;
  unit?: string;
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan';
  height?: number;
  minY?: number;
  maxY?: number;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  title,
  unit = '%',
  color = 'blue',
  height = 140,
  minY = 0,
  maxY = 100,
}) => {
  const colorMap = {
    blue: { stroke: '#3b82f6', fill: 'url(#blueGrad)', text: 'text-blue-400' },
    emerald: { stroke: '#10b981', fill: 'url(#emeraldGrad)', text: 'text-emerald-400' },
    amber: { stroke: '#f59e0b', fill: 'url(#amberGrad)', text: 'text-amber-400' },
    rose: { stroke: '#ef4444', fill: 'url(#roseGrad)', text: 'text-rose-400' },
    cyan: { stroke: '#06b6d4', fill: 'url(#cyanGrad)', text: 'text-cyan-400' },
  }[color];

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 rounded-xl border border-navy-800 bg-navy-950/60 text-xs font-mono text-slate-500">
        Awaiting telemetry samples...
      </div>
    );
  }

  const padding = { top: 15, bottom: 20, left: 35, right: 15 };
  const width = 500; // SVG viewBox coordinate width
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const points = data.map((d, index) => {
    const x = padding.left + (index / Math.max(1, data.length - 1)) * innerWidth;
    const clampedVal = Math.max(minY, Math.min(maxY, d.value));
    const y = padding.top + innerHeight - ((clampedVal - minY) / (maxY - minY)) * innerHeight;
    return { x, y, value: d.value, time: d.time };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

  const latestVal = data[data.length - 1]?.value ?? 0;

  return (
    <div className="rounded-xl border border-navy-800 bg-navy-900/80 p-4 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <span className={`text-base font-bold font-mono ${colorMap.text}`}>
          {latestVal}
          {unit}
        </span>
      </div>

      <div className="w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = padding.top + innerHeight * (1 - ratio);
            const val = Math.round(minY + (maxY - minY) * ratio);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e2d4f"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Filled Area */}
          <path d={areaD} fill={colorMap.fill} />

          {/* Line Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke={colorMap.stroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current pulse dot */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4"
              fill={colorMap.stroke}
              className="animate-pulse"
            />
          )}
        </svg>
      </div>
    </div>
  );
};
