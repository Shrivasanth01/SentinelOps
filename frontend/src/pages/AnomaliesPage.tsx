import React from 'react';
import { AlertTriangle, Brain, Binary, Target } from 'lucide-react';

export const AnomaliesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Machine Learning Anomaly Detection</h1>
          <p className="text-sm text-slate-400 mt-1">
            Unsupervised statistical deviation models, multidimensional Isolation Forests, and dynamic thresholding.
          </p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
          Scheduled: Phase 3
        </span>
      </div>

      <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Isolation Forest Detection Pipeline</h3>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          The ML engine is slated for Phase 3. It will utilize scikit-learn Isolation Forests and moving z-score baselines
          to detect subtle multi-metric anomalies prior to system degradation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left font-mono text-xs">
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Brain className="h-4 w-4 text-amber-400 mb-2" />
            <div className="font-bold text-slate-200">Isolation Forest</div>
            <div className="text-slate-400 text-[11px] mt-1">Multi-variate contamination scoring on 20+ features</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Target className="h-4 w-4 text-rose-400 mb-2" />
            <div className="font-bold text-slate-200">Dynamic Thresholds</div>
            <div className="text-slate-400 text-[11px] mt-1">Adaptive bounds adjusting for diurnal seasonality</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Binary className="h-4 w-4 text-cyan-400 mb-2" />
            <div className="font-bold text-slate-200">Scoring Engine</div>
            <div className="text-slate-400 text-[11px] mt-1">Real-time risk scoring [0.0 - 1.0] per cluster node</div>
          </div>
        </div>
      </div>
    </div>
  );
};

