import React from 'react';
import {
  Layers,
  Cpu,
  Database,
  HardDrive,
  Network,
  Activity,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { FeatureSchemaResponse, AnomalyDetectionResponse } from '../../types/ml';

interface FeatureAnalysisViewProps {
  schema: FeatureSchemaResponse | null;
  detection: AnomalyDetectionResponse | null;
}

export const FeatureAnalysisView: React.FC<FeatureAnalysisViewProps> = ({
  schema,
  detection,
}) => {
  const baseFeatures = schema?.base_features ?? [];
  const derivedFeatures = schema?.derived_features ?? [];
  const currentFeatures = detection?.features ?? {};

  const getFeatureIcon = (name: string) => {
    if (name.includes('cpu')) return <Cpu className="w-4 h-4 text-obs-accent" />;
    if (name.includes('mem')) return <Database className="w-4 h-4 text-obs-accent" />;
    if (name.includes('disk')) return <HardDrive className="w-4 h-4 text-obs-accent" />;
    if (name.includes('net')) return <Network className="w-4 h-4 text-obs-accent" />;
    return <Activity className="w-4 h-4 text-obs-accent" />;
  };

  const formatCurrentValue = (name: string, val?: number) => {
    if (val === undefined || val === null) return 'N/A';
    if (name.includes('percent')) return `${val.toFixed(1)}%`;
    if (name.includes('bytes') || name.includes('volatility')) {
      if (val >= 1024 * 1024) return `${(val / (1024 * 1024)).toFixed(2)} MB/s`;
      if (val >= 1024) return `${(val / 1024).toFixed(1)} KB/s`;
      return `${val.toFixed(0)} B/s`;
    }
    if (name.includes('rate')) return `${val.toFixed(2)} %/step`;
    return val.toFixed(2);
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider">
              Multivariate Feature Engineering Pipeline
            </h3>
            <p className="text-[11px] text-obs-text-muted">
              5 primary system metrics + 6 dynamic rolling & volatility indices fed into Isolation Forest
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="px-2 py-0.5 rounded bg-obs-accent/15 border border-obs-accent/30 text-obs-accent font-mono font-bold">
            Total Dimension: {schema?.total_features ?? 11}D
          </span>
          <span className="text-[11px] text-obs-healthy flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            StandardScaler Active
          </span>
        </div>
      </div>

      {/* Base Features Grid */}
      <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-obs-border/60 pb-2">
          <Cpu className="w-4 h-4 text-obs-accent" />
          <h4 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider">
            Primary Host Telemetry Sensors (5 Base Features)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {baseFeatures.map(feat => {
            const curVal = currentFeatures[feat.name];
            return (
              <div
                key={feat.name}
                className="p-3 rounded border border-obs-border bg-obs-bg-secondary/40 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-obs-text-primary">
                      {getFeatureIcon(feat.name)}
                      {feat.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-obs-panel border border-obs-border text-obs-text-muted font-mono">
                      {feat.unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-obs-text-muted leading-snug">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-obs-border/30 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-obs-text-muted">Live Reading:</span>
                  <span className="font-mono font-bold text-obs-accent">
                    {formatCurrentValue(feat.name, curVal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Derived Rolling Features */}
      <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-obs-border/60 pb-2">
          <Activity className="w-4 h-4 text-obs-accent" />
          <h4 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider">
            Engineered Rolling & Volatility Statistics (6 Derived Features)
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {derivedFeatures.map(feat => {
            const curVal = currentFeatures[feat.name];
            return (
              <div
                key={feat.name}
                className="p-3 rounded border border-obs-border bg-obs-bg-secondary/40 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-obs-text-primary">
                      <Activity className="w-4 h-4 text-obs-warning" />
                      {feat.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-obs-panel border border-obs-border text-obs-text-muted font-mono">
                      {feat.unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-obs-text-muted leading-snug">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-obs-border/30 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-obs-text-muted">Engineered Metric:</span>
                  <span className="font-mono font-bold text-obs-warning">
                    {formatCurrentValue(feat.name, curVal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mathematical Architecture Callout */}
      <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/50 text-xs text-obs-text-secondary space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-obs-text-primary">
          <Info className="w-4 h-4 text-obs-accent" />
          <span>Unsupervised Normalization & Zero-Variance Guard</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Before evaluating decision boundaries, the pipeline runs each feature through an adaptive StandardScaler equipped with a zero-variance floor guard. This guarantees that constant-valued features (such as static disk allocations) do not produce numerical singularities (<code className="text-obs-accent">NaN</code> or division-by-zero artifacts), preserving model integrity during quiet operational windows.
        </p>
      </div>
    </div>
  );
};
