import React, { useState } from 'react';
import {
  X,
  Zap,
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Brain,
} from 'lucide-react';
import { ModelTrainRequest, ModelTrainResponse } from '../../types/ml';

interface ModelTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrain: (params: ModelTrainRequest) => Promise<ModelTrainResponse | null>;
  isTraining: boolean;
}

export const ModelTrainingModal: React.FC<ModelTrainingModalProps> = ({
  isOpen,
  onClose,
  onTrain,
  isTraining,
}) => {
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '6h' | '24h' | '7d'>('1h');
  const [contamination, setContamination] = useState<number>(0.05);
  const [nEstimators, setNEstimators] = useState<number>(100);
  const [notes, setNotes] = useState<string>('');
  const [result, setResult] = useState<ModelTrainResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResult(null);

    try {
      const trainRes = await onTrain({
        time_range: timeRange,
        contamination,
        n_estimators: nEstimators,
        notes: notes.trim() || undefined,
      });
      if (trainRes) {
        setResult(trainRes);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to train model. Check if Prometheus has sufficient historical samples.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-xl border border-obs-border bg-obs-panel p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-obs-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-obs-text-primary tracking-wide">
                Calibrate Unsupervised Isolation Forest
              </h3>
              <p className="text-[11px] text-obs-text-muted">
                Extracts actual Prometheus host telemetry and fits contamination tree ensemble
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isTraining}
            className="text-obs-text-muted hover:text-obs-text-primary p-1 rounded hover:bg-obs-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Historical Range */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-obs-text-secondary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-obs-accent" />
              Historical Telemetry Range (Scraped from Prometheus)
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['15m', '1h', '6h', '24h', '7d'] as const).map(range => (
                <button
                  type="button"
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`py-1.5 rounded border text-center font-mono font-medium transition-colors ${
                    timeRange === range
                      ? 'border-obs-accent bg-obs-accent/20 text-obs-accent font-bold'
                      : 'border-obs-border bg-obs-bg-secondary text-obs-text-secondary hover:bg-obs-surface'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-obs-text-muted">
              Note: Requires at least 30 aligned telemetry frames from Windows Exporter in this window.
            </p>
          </div>

          {/* Contamination */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <label className="font-semibold text-obs-text-secondary flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-obs-accent" />
                Contamination Factor (Expected Outlier Proportion)
              </label>
              <span className="font-mono font-bold text-obs-accent">{(contamination * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.20"
              step="0.01"
              value={contamination}
              onChange={e => setContamination(parseFloat(e.target.value))}
              className="w-full accent-obs-accent cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-obs-text-muted">
              <span>1% (Conservative)</span>
              <span>5% (Recommended)</span>
              <span>20% (Aggressive)</span>
            </div>
          </div>

          {/* Number of Estimators */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-obs-text-secondary">
              Ensemble Trees (n_estimators)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 150, 200].map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setNEstimators(n)}
                  className={`py-1.5 rounded border text-center font-mono font-medium transition-colors ${
                    nEstimators === n
                      ? 'border-obs-accent bg-obs-accent/20 text-obs-accent font-bold'
                      : 'border-obs-border bg-obs-bg-secondary text-obs-text-secondary hover:bg-obs-surface'
                  }`}
                >
                  {n} trees
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-obs-text-secondary">
              Operator Calibration Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Standard production baseline calibration"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-obs-border bg-obs-bg-secondary text-obs-text-primary focus:outline-none focus:border-obs-accent text-xs"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded border border-obs-critical/40 bg-obs-critical/15 text-obs-critical text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Training Results Banner */}
          {result && (
            <div className="p-3 rounded border border-obs-healthy/40 bg-obs-healthy/10 text-xs space-y-2">
              <div className="flex items-center gap-2 text-obs-healthy font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Model Fitted & Activated Successfully: {result.version}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-obs-text-secondary">
                <div>Training: <b>{result.training_sample_count}</b> rows</div>
                <div>Holdout: <b>{result.holdout_sample_count}</b> rows</div>
                <div>Anomaly Rate: <b>{(result.anomaly_rate * 100).toFixed(1)}%</b></div>
              </div>
              <p className="text-[9px] text-obs-text-muted italic border-t border-obs-border/40 pt-1">
                {result.evaluation_disclaimer}
              </p>
            </div>
          )}

          {/* Modal Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-obs-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isTraining}
              className="px-3 py-1.5 rounded border border-obs-border bg-obs-bg-secondary text-obs-text-secondary hover:text-obs-text-primary transition-colors text-xs"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isTraining}
              className="px-4 py-1.5 rounded border border-obs-accent/40 bg-obs-accent hover:bg-obs-accent/90 text-black font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? 'Training Model...' : 'Train & Hot-Swap Model'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
