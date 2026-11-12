import React from 'react';
import { Brain, RefreshCw, Zap, ShieldAlert, CheckCircle2, Sliders, Scan } from 'lucide-react';
import { useAnomalies } from '../hooks/useAnomalies';
import { AnomalySeverity } from '../types/anomalies';

export const AnomaliesPage: React.FC = () => {
  const { score, anomalies, isRetraining, refresh, retrain, simulate } = useAnomalies(4000, true);

  const getSeverityBadge = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'LOW':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const getRiskColor = (s?: number) => {
    if (!s) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (s >= 0.75) return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    if (s >= 0.50) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Machine Learning Anomaly Detection</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Isolation Forest Active
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Unsupervised statistical deviation analysis and multivariate Isolation Forest anomaly classification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <Scan className="h-3.5 w-3.5 text-cyan-400" />
            <span>Scan Now</span>
          </button>

          <button
            onClick={() => simulate('CRITICAL', 'Cpu Percent')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Simulate Anomaly</span>
          </button>

          <button
            onClick={retrain}
            disabled={isRetraining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-navy-800 text-white text-xs font-mono font-medium transition-all shadow-md shadow-blue-600/20"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
            <span>Retrain Model</span>
          </button>
        </div>
      </div>

      {/* Top Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Real-time Risk Score Gauge */}
        <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-semibold">
              Current Anomaly Risk
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getRiskColor(score?.score)}`}>
              {score?.status || 'EVALUATING'}
            </span>
          </div>

          <div className="my-5 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold font-mono text-white">
              {score ? (score.score * 100).toFixed(1) : 0}%
            </span>
            <span className="text-xs font-mono text-slate-400">risk factor [0 - 100]</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-navy-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${
                  (score?.score ?? 0) >= 0.70
                    ? 'bg-rose-500'
                    : (score?.score ?? 0) >= 0.50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (score?.score ?? 0) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-500">
              <span>0% Nominal</span>
              <span>50% Elevated</span>
              <span>100% Critical</span>
            </div>
          </div>
        </div>

        {/* Isolation Forest Algorithm Spec */}
        <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-xl font-mono text-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-3">
            <Brain className="h-4 w-4 text-amber-400" />
            <span>Isolation Forest Architecture</span>
          </div>

          <div className="space-y-2 text-slate-400">
            <div className="flex justify-between border-b border-navy-800/80 pb-1.5">
              <span>Ensemble Estimators:</span>
              <span className="text-white font-bold">100 Trees</span>
            </div>
            <div className="flex justify-between border-b border-navy-800/80 pb-1.5">
              <span>Contamination Rate:</span>
              <span className="text-blue-400 font-bold">5.0%</span>
            </div>
            <div className="flex justify-between border-b border-navy-800/80 pb-1.5">
              <span>Feature Dimensions:</span>
              <span className="text-white font-bold">6 Metrics</span>
            </div>
            <div className="flex justify-between">
              <span>Baseline Samples:</span>
              <span className="text-emerald-400 font-bold">{score?.baseline_samples ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Contributing Deviations */}
        <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-xl font-mono text-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-3">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <span>Active Factor Deviations</span>
          </div>

          {score && score.contributing_metrics.length > 0 ? (
            <div className="flex flex-wrap gap-2 my-auto">
              {score.contributing_metrics.map((metric, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold"
                >
                  ⚠ {metric}
                </span>
              ))}
            </div>
          ) : (
            <div className="my-auto p-4 rounded-xl bg-navy-950/60 border border-navy-800 text-slate-400 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
              <span>All 6 features within normal statistical boundaries</span>
            </div>
          )}

          <div className="text-[11px] text-slate-500 pt-2 border-t border-navy-800/80">
            Z-score distance threshold: &gt; 2.0 &sigma;
          </div>
        </div>
      </div>

      {/* Flagged Anomalies Table */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/80 p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-navy-800 mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-white text-base">Flagged Anomaly Incidents</h3>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-navy-800 text-slate-400">
            {anomalies.length} Events Detected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Severity</th>
                <th className="pb-3 font-semibold">Anomaly Score</th>
                <th className="pb-3 font-semibold">Contributing Factors</th>
                <th className="pb-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 text-slate-300">
              {anomalies.map((item) => (
                <tr key={item.id} className="hover:bg-navy-850/40 transition-colors">
                  <td className="py-3 text-slate-400 whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(item.severity)}`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-white">
                    {(item.score * 100).toFixed(1)}%
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.contributing_metrics.map((m, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-navy-800 text-slate-300 text-[10px] border border-navy-700">
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 text-slate-400 max-w-md break-words">
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
