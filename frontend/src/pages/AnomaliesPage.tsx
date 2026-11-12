import React from 'react';
import {
  Brain,
  RefreshCw,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Scan,
} from 'lucide-react';
import { useAnomalies } from '../hooks/useAnomalies';
import { AnomalySeverity } from '../types/anomalies';

export const AnomaliesPage: React.FC = () => {
  const { score, anomalies, isRetraining, refresh, retrain, simulate } = useAnomalies(4000, true);

  const getSeverityBadge = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-obs-critical/20 text-obs-critical border-obs-critical/40';
      case 'HIGH':
        return 'bg-obs-critical/10 text-obs-critical border-obs-critical/30';
      case 'MEDIUM':
        return 'bg-obs-warning/10 text-obs-warning border-obs-warning/30';
      case 'LOW':
      default:
        return 'bg-obs-healthy/10 text-obs-healthy border-obs-healthy/30';
    }
  };

  const getRiskColor = (s?: number) => {
    if (!s) return 'text-obs-healthy border-obs-healthy/30 bg-obs-healthy/10';
    if (s >= 0.75) return 'text-obs-critical border-obs-critical/30 bg-obs-critical/10';
    if (s >= 0.5) return 'text-obs-warning border-obs-warning/30 bg-obs-warning/10';
    return 'text-obs-healthy border-obs-healthy/30 bg-obs-healthy/10';
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Brain className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text-primary">
                Multivariate ML Anomaly Radar
              </h1>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-obs-accent/15 border border-obs-accent/30 text-obs-accent">
                ISOLATION FOREST v1.0
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              Unsupervised statistical deviation detection across 240-frame telemetry ring buffer
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors text-[11px]"
          >
            <Scan className="w-3.5 h-3.5 text-obs-accent" />
            <span>Scan Buffer</span>
          </button>

          <button
            onClick={() => simulate('CRITICAL', 'cpu_percent')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors text-[11px]"
          >
            <Zap className="w-3.5 h-3.5 text-obs-warning" />
            <span>Simulate Anomaly</span>
          </button>

          <button
            onClick={retrain}
            disabled={isRetraining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-obs-accent/40 bg-obs-accent/10 hover:bg-obs-accent/20 text-obs-accent text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
            <span>Retrain Model</span>
          </button>
        </div>
      </div>

      {/* Model KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Real-time Risk Score */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-obs-text-muted">
              Multivariate Deviation Score
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskColor(
                score?.score
              )}`}
            >
              {score?.status || 'NOMINAL'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-obs-text-primary">
              {score ? (score.score * 100).toFixed(1) : '0.0'}%
            </span>
            <span className="text-[10px] text-obs-text-muted">anomaly likelihood [0 - 100]</span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-obs-bg overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                (score?.score ?? 0) >= 0.7
                  ? 'bg-obs-critical'
                  : (score?.score ?? 0) >= 0.5
                  ? 'bg-obs-warning'
                  : 'bg-obs-healthy'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, (score?.score ?? 0) * 100))}%` }}
            />
          </div>
        </div>

        {/* Algorithm Configuration */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-obs-text-muted">Hyperparameters</span>
            <span className="text-[10px] text-obs-accent">Scikit-Learn</span>
          </div>

          <div className="space-y-1 text-xs text-obs-text-secondary">
            <div className="flex justify-between">
              <span className="text-obs-text-muted">Ensemble Trees:</span>
              <span className="text-obs-text-primary">100 estimators</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obs-text-muted">Contamination Factor:</span>
              <span className="text-obs-text-primary">0.05 (5%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obs-text-muted">Calibration Frames:</span>
              <span className="text-obs-text-primary">240 metric vectors</span>
            </div>
          </div>
        </div>

        {/* Feature Vector Space */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-obs-text-muted">
              Vector Space Features
            </span>
            <span className="text-[10px] text-obs-healthy">4-DIMENSIONAL</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded text-[10px] bg-obs-surface border border-obs-border text-obs-text-secondary">
              cpu.overall_percent
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-obs-surface border border-obs-border text-obs-text-secondary">
              memory.percent
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-obs-surface border border-obs-border text-obs-text-secondary">
              disk.percent
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-obs-surface border border-obs-border text-obs-text-secondary">
              network.bytes_rate
            </span>
          </div>
        </div>
      </div>

      {/* Detected Anomalies Table */}
      <div className="rounded-lg border border-obs-border bg-obs-panel/80 overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-obs-border/70 bg-obs-bg-secondary/60">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-obs-accent" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-obs-text-primary">
              Detected Anomalies & Deviations
            </h3>
          </div>
          <span className="text-[10px] text-obs-text-muted">
            {anomalies.length} registered event(s)
          </span>
        </div>

        <div className="divide-y divide-obs-border/50 max-h-[500px] overflow-y-auto">
          {anomalies.length === 0 ? (
            <div className="py-12 text-center text-obs-text-muted space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-obs-healthy" />
              <p className="text-xs font-semibold text-obs-text-primary">No Anomalies Detected</p>
              <p className="text-[11px]">All host telemetry signals fall within nominal Gaussian boundaries.</p>
            </div>
          ) : (
            anomalies.map((a) => (
              <div
                key={a.id}
                className="p-3 hover:bg-obs-surface/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.2 rounded border text-[9px] uppercase font-bold ${getSeverityBadge(
                        a.severity
                      )}`}
                    >
                      {a.severity}
                    </span>
                    <span className="text-[10px] text-obs-text-muted">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-obs-accent font-semibold">
                      [{a.contributing_metrics?.[0] || 'multivariate'}]
                    </span>
                  </div>
                  <p className="text-obs-text-primary font-sans text-xs">
                    {a.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-obs-text-muted">SCORE</div>
                    <div className="text-sm font-bold text-obs-critical font-mono">
                      {(a.score * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
