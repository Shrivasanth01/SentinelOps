import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { ModelMetadata, ModelEvaluationResponse } from '../../types/ml';
import { mlService } from '../../services/mlService';

interface ModelRegistryViewProps {
  models: ModelMetadata[];
  onActivateModel: (id: string) => Promise<void>;
  onOpenTrainModal: () => void;
}

export const ModelRegistryView: React.FC<ModelRegistryViewProps> = ({
  models,
  onActivateModel,
  onOpenTrainModal,
}) => {
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [evalReport, setEvalReport] = useState<ModelEvaluationResponse | null>(null);

  const handleActivate = async (id: string) => {
    setActivatingId(id);
    try {
      await onActivateModel(id);
    } finally {
      setActivatingId(null);
    }
  };

  const handleEvaluate = async (id: string) => {
    setEvaluatingId(id);
    try {
      const res = await mlService.evaluateModel(id, '1h');
      if (res.data) {
        setEvalReport(res.data);
      }
    } catch (err) {
      console.error('Holdout evaluation failed:', err);
    } finally {
      setEvaluatingId(null);
    }
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (isActive) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-obs-healthy/20 text-obs-healthy border border-obs-healthy/40 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> ACTIVE SERVING
        </span>
      );
    }
    switch (status) {
      case 'SUPERSEDED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-obs-border/40 text-obs-text-muted border border-obs-border">
            SUPERSEDED
          </span>
        );
      case 'CANDIDATE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-obs-warning/15 text-obs-warning border border-obs-warning/30">
            CANDIDATE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] bg-obs-border/30 text-obs-text-muted border border-obs-border/50">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Strip */}
      <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider">
              Isolation Forest Model Registry & Rollback Controller
            </h3>
            <p className="text-[11px] text-obs-text-muted">
              Zero-downtime hot-swappable model weights with holdout empirical assessment
            </p>
          </div>
        </div>

        <button
          onClick={onOpenTrainModal}
          className="px-3 py-1.5 rounded border border-obs-accent/40 bg-obs-accent/10 hover:bg-obs-accent/20 text-obs-accent text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Train New Isolation Forest</span>
        </button>
      </div>

      {/* Models Table */}
      <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-obs-border/60 text-[10px] uppercase text-obs-text-muted tracking-wider">
                <th className="py-2 px-2.5">Version Identifier</th>
                <th className="py-2 px-2.5">Status</th>
                <th className="py-2 px-2.5">Training Samples</th>
                <th className="py-2 px-2.5">Hyperparameters</th>
                <th className="py-2 px-2.5">Created At</th>
                <th className="py-2 px-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obs-border/30">
              {models.length > 0 ? (
                models.map(m => (
                  <tr
                    key={m.id}
                    className={`hover:bg-obs-surface/40 transition-colors ${
                      m.is_active ? 'bg-obs-accent/5' : ''
                    }`}
                  >
                    <td className="py-3 px-2.5 font-mono text-xs font-semibold text-obs-text-primary">
                      <div className="flex items-center gap-2">
                        {m.is_active && <ShieldCheck className="w-3.5 h-3.5 text-obs-healthy shrink-0" />}
                        <span>{m.version}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2.5 whitespace-nowrap">
                      {getStatusBadge(m.status, m.is_active)}
                    </td>
                    <td className="py-3 px-2.5 font-mono text-xs text-obs-text-secondary whitespace-nowrap">
                      {m.training_sample_count} observations
                    </td>
                    <td className="py-3 px-2.5 text-[11px] text-obs-text-secondary whitespace-nowrap">
                      <div className="space-y-0.5 font-mono text-[10px]">
                        <div>Contamination: <span className="text-obs-accent">{m.contamination}</span></div>
                        <div>Estimators: <span className="text-obs-accent">{m.n_estimators}</span> | Seed: {m.random_state}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2.5 font-mono text-[10px] text-obs-text-muted whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEvaluate(m.id)}
                          disabled={evaluatingId === m.id}
                          className="px-2 py-1 text-[10px] rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <Sliders className="w-3 h-3 text-obs-accent" />
                          <span>{evaluatingId === m.id ? 'Evaluating...' : 'Holdout Eval'}</span>
                        </button>

                        {!m.is_active && (
                          <button
                            onClick={() => handleActivate(m.id)}
                            disabled={activatingId === m.id}
                            className="px-2.5 py-1 text-[10px] rounded border border-obs-accent/40 bg-obs-accent/10 hover:bg-obs-accent/20 text-obs-accent font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{activatingId === m.id ? 'Hot-Swapping...' : 'Activate / Rollback'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-obs-text-muted">
                    No models registered in the database. Click "Train New Isolation Forest" to calibrate on historical Prometheus telemetry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Holdout Evaluation Modal / Banner */}
      {evalReport && (
        <div className="p-3.5 rounded-lg border border-obs-accent/30 bg-obs-panel/90 backdrop-blur-sm space-y-2">
          <div className="flex items-center justify-between border-b border-obs-border/60 pb-1.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-obs-accent" />
              <h4 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider">
                Unsupervised Holdout Evaluation: {evalReport.version}
              </h4>
            </div>
            <button
              onClick={() => setEvalReport(null)}
              className="text-[10px] text-obs-text-muted hover:text-obs-text-primary"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-1">
            <div className="bg-obs-bg-secondary/60 p-2 rounded border border-obs-border/40">
              <div className="text-[10px] text-obs-text-muted">Holdout Samples</div>
              <div className="text-xs font-bold text-obs-text-primary font-mono">{evalReport.evaluation_samples}</div>
            </div>
            <div className="bg-obs-bg-secondary/60 p-2 rounded border border-obs-border/40">
              <div className="text-[10px] text-obs-text-muted">Empirical Anomaly Rate</div>
              <div className="text-xs font-bold text-obs-accent font-mono">{(evalReport.anomaly_rate * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-obs-bg-secondary/60 p-2 rounded border border-obs-border/40">
              <div className="text-[10px] text-obs-text-muted">Mean Risk Score</div>
              <div className="text-xs font-bold text-obs-text-primary font-mono">{evalReport.score_mean.toFixed(3)}</div>
            </div>
            <div className="bg-obs-bg-secondary/60 p-2 rounded border border-obs-border/40">
              <div className="text-[10px] text-obs-text-muted">Stability Index</div>
              <div className={`text-xs font-bold font-mono ${
                evalReport.stability_assessment === 'STABLE' ? 'text-obs-healthy' : 'text-obs-warning'
              }`}>
                {evalReport.stability_assessment}
              </div>
            </div>
          </div>

          {/* Quantiles breakdown */}
          {evalReport.score_quantiles && (
            <div className="text-[10px] text-obs-text-muted pt-1 flex flex-wrap gap-3">
              <span>Score Quantiles:</span>
              <span>p05: <b className="text-obs-text-secondary font-mono">{evalReport.score_quantiles.p05}</b></span>
              <span>p25: <b className="text-obs-text-secondary font-mono">{evalReport.score_quantiles.p25}</b></span>
              <span>p50 (Median): <b className="text-obs-text-secondary font-mono">{evalReport.score_quantiles.p50}</b></span>
              <span>p75: <b className="text-obs-text-secondary font-mono">{evalReport.score_quantiles.p75}</b></span>
              <span>p95: <b className="text-obs-text-secondary font-mono">{evalReport.score_quantiles.p95}</b></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
