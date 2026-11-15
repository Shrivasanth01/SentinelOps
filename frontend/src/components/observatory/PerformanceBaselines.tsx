import React, { useState } from 'react';
import {
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Clock,
  Compass,
} from 'lucide-react';
import { useBaselines } from '../../hooks/useBaselines';
import { StatisticalBaseline, DeviationStatus } from '../../types/analytics';

export const PerformanceBaselines: React.FC = () => {
  const [duration, setDuration] = useState<string>('24h');
  const { data, isLoading, lastRefreshed, refresh } = useBaselines(duration, 20000);

  const baselines = data?.baselines || [];
  const totalMetrics = data?.total_metrics || 0;
  const deviations = data?.deviations_detected || 0;
  const sufficientCount = data?.sufficient_data_count || 0;

  const getStatusBadge = (status: DeviationStatus) => {
    switch (status) {
      case 'NOMINAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-obs-healthy/15 border border-obs-healthy/30 text-obs-healthy">
            <CheckCircle2 className="w-3 h-3" /> NOMINAL (WITHIN 2σ)
          </span>
        );
      case 'WARNING_DEVIATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-obs-warning/15 border border-obs-warning/30 text-obs-warning animate-pulse">
            <AlertTriangle className="w-3 h-3" /> ELEVATED (2σ - 3σ)
          </span>
        );
      case 'CRITICAL_DEVIATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-obs-critical/20 border border-obs-critical/40 text-obs-critical animate-pulse">
            <AlertOctagon className="w-3 h-3" /> CRITICAL DEVIATION (&gt;3σ)
          </span>
        );
      case 'INSUFFICIENT_DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-obs-border/60 border border-obs-border text-obs-text-muted">
            <HelpCircle className="w-3 h-3" /> INSUFFICIENT DATA (&lt;10)
          </span>
        );
    }
  };

  const renderZScoreBar = (b: StatisticalBaseline) => {
    if (!b.has_sufficient_data || b.z_score === null || b.z_score === undefined) {
      return (
        <div className="w-full bg-obs-bg border border-obs-border/70 rounded h-2 relative overflow-hidden">
          <div
            className="h-full bg-obs-text-muted/40 transition-all"
            style={{ width: `${Math.min(100, (b.sample_count / 10) * 100)}%` }}
          />
        </div>
      );
    }

    // Z-score bounds clamped from -3.5 to +3.5 for bar display
    const clampedZ = Math.max(-3.5, Math.min(3.5, b.z_score));
    const positionPercent = ((clampedZ + 3.5) / 7.0) * 100;

    let markerColor = 'bg-obs-healthy';
    if (Math.abs(b.z_score) >= 3.0) markerColor = 'bg-obs-critical';
    else if (Math.abs(b.z_score) >= 2.0) markerColor = 'bg-obs-warning';

    return (
      <div className="space-y-1">
        <div className="w-full bg-obs-bg border border-obs-border/80 rounded h-2.5 relative">
          {/* Neutral center mark */}
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-obs-text-muted/40" />
          {/* -2σ and +2σ markers */}
          <div className="absolute top-0 bottom-0 left-[21.4%] w-0.5 bg-obs-warning/30" />
          <div className="absolute top-0 bottom-0 right-[21.4%] w-0.5 bg-obs-warning/30" />

          {/* Current Z-score indicator */}
          <div
            className={`absolute top-[-2px] bottom-[-2px] w-2 rounded-full ${markerColor} shadow-[0_0_8px_currentColor] transform -translate-x-1/2 transition-all duration-300`}
            style={{ left: `${positionPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-obs-text-muted">
          <span>-3σ</span>
          <span>-2σ</span>
          <span>μ</span>
          <span>+2σ</span>
          <span>+3σ</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text">
              Statistical Performance Baselines & Deviation Radar
            </h1>
            <div className="text-[10px] text-obs-text-muted">
              Dynamically computes historical normal operating bounds (μ, σ, Z-score)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded border border-obs-border bg-obs-bg/80 p-0.5">
            <button
              onClick={() => setDuration('1h')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                duration === '1h'
                  ? 'bg-obs-accent/30 text-obs-accent border border-obs-accent/50'
                  : 'text-obs-text-muted hover:text-obs-text'
              }`}
            >
              1H WINDOW
            </button>
            <button
              onClick={() => setDuration('24h')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                duration === '24h'
                  ? 'bg-obs-accent/30 text-obs-accent border border-obs-accent/50'
                  : 'text-obs-text-muted hover:text-obs-text'
              }`}
            >
              24H WINDOW
            </button>
          </div>

          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-obs-border rounded bg-obs-bg/60 text-obs-text-muted hover:text-obs-text hover:border-obs-accent transition-colors disabled:opacity-50"
            title="Recalculate Baselines"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-obs-accent' : ''}`} />
            <span className="hidden sm:inline">RECALCULATE</span>
          </button>
        </div>
      </div>

      {/* Summary Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Metrics Monitored</div>
          <div className="mt-1 text-xl font-bold text-obs-text">{totalMetrics}</div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Subsystem baseline models</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Sufficient Data</div>
          <div className="mt-1 text-xl font-bold text-obs-accent">
            {sufficientCount} / {totalMetrics}
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Models with ≥10 historical points</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Deviations (&gt;2σ)</div>
          <div className={`mt-1 text-xl font-bold ${deviations > 0 ? 'text-obs-warning' : 'text-obs-healthy'}`}>
            {deviations}
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Unusual spikes or drops detected</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Evaluated At</div>
          <div className="mt-1 text-sm font-bold text-obs-text truncate">
            {lastRefreshed.toLocaleTimeString()}
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Automated rolling computation</div>
        </div>
      </div>

      {/* Baselines Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {baselines.map((b) => (
          <div
            key={b.metric_key}
            className="p-4 rounded-lg border border-obs-border bg-obs-panel/90 space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2 border-b border-obs-border/70">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-obs-accent" />
                <span className="text-xs font-bold text-obs-text uppercase">{b.metric_label}</span>
              </div>
              <div>{getStatusBadge(b.deviation_status)}</div>
            </div>

            {/* Readout Numbers */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded bg-obs-bg/60 border border-obs-border/60">
                <div className="text-[9px] text-obs-text-muted uppercase">Live Value</div>
                <div className="text-base font-bold text-obs-text mt-0.5">
                  {b.current_value !== null && b.current_value !== undefined ? `${b.current_value.toFixed(1)} ${b.unit}` : '--'}
                </div>
              </div>

              <div className="p-2 rounded bg-obs-bg/60 border border-obs-border/60">
                <div className="text-[9px] text-obs-text-muted uppercase">Historical Mean (μ)</div>
                <div className="text-base font-bold text-obs-accent mt-0.5">
                  {b.historical_mean !== null && b.historical_mean !== undefined ? `${b.historical_mean.toFixed(1)} ${b.unit}` : '--'}
                </div>
              </div>

              <div className="p-2 rounded bg-obs-bg/60 border border-obs-border/60">
                <div className="text-[9px] text-obs-text-muted uppercase">Z-Score Deviation</div>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    b.z_score === null || b.z_score === undefined
                      ? 'text-obs-text-muted'
                      : Math.abs(b.z_score) >= 3.0
                      ? 'text-obs-critical'
                      : Math.abs(b.z_score) >= 2.0
                      ? 'text-obs-warning'
                      : 'text-obs-healthy'
                  }`}
                >
                  {b.z_score !== null && b.z_score !== undefined ? `${b.z_score > 0 ? '+' : ''}${b.z_score.toFixed(2)}σ` : '--'}
                </div>
              </div>
            </div>

            {/* Standard Deviation Gauge Bar */}
            <div className="pt-1">
              <div className="text-[9px] text-obs-text-muted flex justify-between mb-1">
                <span>STATISTICAL DISTRIBUTION (NORMAL ENVELOPE ±2σ)</span>
                <span>
                  {b.has_sufficient_data
                    ? `σ = ${b.historical_stddev?.toFixed(2) ?? '--'} ${b.unit}`
                    : `Samples: ${b.sample_count}/10`}
                </span>
              </div>
              {renderZScoreBar(b)}
            </div>

            {/* Baseline Detail Footnotes */}
            <div className="pt-2 border-t border-obs-border/40 text-[10px] text-obs-text-muted flex items-start gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-obs-accent" />
              <span>
                {b.deviation_message || 'Operating normally within historical tolerance window.'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
