import React from 'react';
import {
  Brain,
  Cpu,
  Database,
  HardDrive,
  Network,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  AnomalyDetectionResponse,
  MLStatusResponse,
  AnomalySummaryResponse,
} from '../../types/ml';

interface AnomalyOverviewProps {
  detection: AnomalyDetectionResponse | null;
  status: MLStatusResponse | null;
  summary: AnomalySummaryResponse | null;
  isDetecting: boolean;
  onTriggerDetection: () => void;
  onOpenTrainModal: () => void;
}

export const AnomalyOverview: React.FC<AnomalyOverviewProps> = ({
  detection,
  status,
  summary,
  isDetecting,
  onTriggerDetection,
  onOpenTrainModal,
}) => {
  const score = detection?.score ?? 0.0;
  const isAnomaly = detection?.prediction === 'ANOMALOUS';
  const isUnknown = detection?.prediction === 'UNKNOWN';

  const getScoreColor = (val: number) => {
    if (val >= 0.8) return 'text-obs-critical border-obs-critical/40 bg-obs-critical/15';
    if (val >= 0.65) return 'text-obs-warning border-obs-warning/40 bg-obs-warning/15';
    return 'text-obs-healthy border-obs-healthy/40 bg-obs-healthy/15';
  };

  const getSeverityBadge = (sev?: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-obs-critical/20 text-obs-critical border-obs-critical/40 animate-pulse';
      case 'HIGH':
        return 'bg-obs-critical/15 text-obs-critical border-obs-critical/30';
      case 'MEDIUM':
        return 'bg-obs-warning/15 text-obs-warning border-obs-warning/30';
      case 'LOW':
        return 'bg-obs-healthy/10 text-obs-healthy border-obs-healthy/30';
      default:
        return 'bg-obs-border/30 text-obs-text-muted border-obs-border/50';
    }
  };

  const cpuVal = detection?.features?.cpu_usage_percent ?? 0;
  const memVal = detection?.features?.memory_usage_percent ?? 0;
  const diskVal = detection?.features?.disk_usage_percent ?? 0;
  const rxVal = detection?.features?.network_receive_bytes_per_second ?? 0;
  const txVal = detection?.features?.network_transmit_bytes_per_second ?? 0;

  return (
    <div className="space-y-4">
      {/* Top Observatory KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Real-time Risk Score */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] tracking-wider uppercase text-obs-text-muted flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-obs-accent" />
              Multivariate Risk Score
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getScoreColor(score)}`}>
              {(score * 100).toFixed(1)}%
            </span>
          </div>

          <div className="space-y-1.5 my-2">
            <div className="h-2 rounded-full bg-obs-bg-secondary overflow-hidden border border-obs-border/50">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  score >= 0.8
                    ? 'bg-gradient-to-r from-obs-warning to-obs-critical'
                    : score >= 0.65
                    ? 'bg-gradient-to-r from-obs-accent to-obs-warning'
                    : 'bg-gradient-to-r from-obs-accent to-obs-healthy'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, score * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-obs-text-muted">
              <span>0.0 (Nominal)</span>
              <span>0.70 Threshold</span>
              <span>1.0 (Critical)</span>
            </div>
          </div>

          <div className="text-[10px] text-obs-text-secondary truncate">
            Raw decision distance: <span className="text-obs-text-primary font-mono">{detection?.raw_score?.toFixed(4) ?? '0.0000'}</span>
          </div>
        </div>

        {/* Prediction State */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] tracking-wider uppercase text-obs-text-muted flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-obs-accent" />
              Inference Decision
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityBadge(detection?.severity)}`}>
              {detection?.severity ?? 'NONE'}
            </span>
          </div>

          <div className="my-2 flex items-center gap-2">
            {isUnknown ? (
              <div className="flex items-center gap-2 text-obs-text-muted">
                <AlertTriangle className="w-5 h-5 text-obs-warning" />
                <span className="text-base font-bold tracking-wide">MODEL UNLOADED</span>
              </div>
            ) : isAnomaly ? (
              <div className="flex items-center gap-2 text-obs-critical">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
                <span className="text-base font-bold tracking-wide">ANOMALY DETECTED</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-obs-healthy">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-base font-bold tracking-wide">NOMINAL CLUSTER</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-obs-text-muted flex items-center gap-1 truncate">
            <Clock className="w-3 h-3 text-obs-accent" />
            <span>Last evaluated: {detection?.timestamp ? new Date(detection.timestamp).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>

        {/* Active Model Metadata */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] tracking-wider uppercase text-obs-text-muted flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-obs-accent" />
              Active ML Engine
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
              status?.engine_status === 'ONLINE'
                ? 'bg-obs-healthy/15 text-obs-healthy border-obs-healthy/30'
                : 'bg-obs-warning/15 text-obs-warning border-obs-warning/30'
            }`}>
              {status?.engine_status ?? 'UNKNOWN'}
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-xs font-semibold text-obs-text-primary truncate">
              {status?.active_model_version ?? 'No model active'}
            </div>
            <div className="text-[10px] text-obs-text-muted mt-0.5">
              Models registered: <span className="text-obs-accent font-semibold">{status?.total_registered_models ?? 0}</span>
            </div>
          </div>

          <button
            onClick={onOpenTrainModal}
            className="w-full text-center py-1 px-2 text-[10px] rounded border border-obs-accent/40 bg-obs-accent/10 hover:bg-obs-accent/20 text-obs-accent transition-colors font-medium flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3 h-3" />
            Train New Model
          </button>
        </div>

        {/* 24h Telemetry Summary */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] tracking-wider uppercase text-obs-text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-obs-accent" />
              24h Anomaly Summary
            </span>
            <span className="text-[10px] text-obs-accent font-mono font-bold">
              {summary?.anomalous_count ?? 0} spikes
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-1 text-[11px]">
            <div className="bg-obs-bg-secondary/60 p-1.5 rounded border border-obs-border/40">
              <div className="text-[9px] text-obs-text-muted">Total Events</div>
              <div className="text-xs font-bold text-obs-text-primary">{summary?.total_detections ?? 0}</div>
            </div>
            <div className="bg-obs-bg-secondary/60 p-1.5 rounded border border-obs-border/40">
              <div className="text-[9px] text-obs-text-muted">Unacknowledged</div>
              <div className={`text-xs font-bold ${
                (summary?.unacknowledged_count ?? 0) > 0 ? 'text-obs-warning' : 'text-obs-healthy'
              }`}>
                {summary?.unacknowledged_count ?? 0}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-obs-text-muted truncate">
            Critical: <span className="text-obs-critical font-bold">{summary?.severity_breakdown?.CRITICAL ?? 0}</span> | High: <span className="text-obs-warning font-bold">{summary?.severity_breakdown?.HIGH ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Feature Telemetry Snapshot & Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Telemetry Gauge Cards */}
        <div className="lg:col-span-2 p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-obs-border/60 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-obs-accent" />
              <h3 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider">
                Telemetry Feature Vector (Current Observation)
              </h3>
            </div>
            <button
              onClick={onTriggerDetection}
              disabled={isDetecting}
              className="text-[11px] px-2.5 py-1 rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-accent transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap className={`w-3 h-3 ${isDetecting ? 'animate-spin' : ''}`} />
              <span>Evaluate Live Host</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            {/* CPU */}
            <div className="p-2.5 rounded border border-obs-border bg-obs-bg-secondary/50">
              <div className="flex items-center justify-between text-[10px] text-obs-text-muted mb-1">
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-obs-accent" /> CPU</span>
                <span className="font-mono font-bold text-obs-text-primary">{cpuVal.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-obs-panel rounded-full overflow-hidden">
                <div
                  className={`h-full ${cpuVal >= 80 ? 'bg-obs-critical' : cpuVal >= 60 ? 'bg-obs-warning' : 'bg-obs-accent'}`}
                  style={{ width: `${Math.min(100, cpuVal)}%` }}
                />
              </div>
            </div>

            {/* Memory */}
            <div className="p-2.5 rounded border border-obs-border bg-obs-bg-secondary/50">
              <div className="flex items-center justify-between text-[10px] text-obs-text-muted mb-1">
                <span className="flex items-center gap-1"><Database className="w-3 h-3 text-obs-accent" /> RAM</span>
                <span className="font-mono font-bold text-obs-text-primary">{memVal.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-obs-panel rounded-full overflow-hidden">
                <div
                  className={`h-full ${memVal >= 85 ? 'bg-obs-critical' : memVal >= 70 ? 'bg-obs-warning' : 'bg-obs-accent'}`}
                  style={{ width: `${Math.min(100, memVal)}%` }}
                />
              </div>
            </div>

            {/* Disk */}
            <div className="p-2.5 rounded border border-obs-border bg-obs-bg-secondary/50">
              <div className="flex items-center justify-between text-[10px] text-obs-text-muted mb-1">
                <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-obs-accent" /> Disk C:</span>
                <span className="font-mono font-bold text-obs-text-primary">{diskVal.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-obs-panel rounded-full overflow-hidden">
                <div
                  className={`h-full ${diskVal >= 90 ? 'bg-obs-critical' : diskVal >= 80 ? 'bg-obs-warning' : 'bg-obs-healthy'}`}
                  style={{ width: `${Math.min(100, diskVal)}%` }}
                />
              </div>
            </div>

            {/* Network RX */}
            <div className="p-2.5 rounded border border-obs-border bg-obs-bg-secondary/50">
              <div className="flex items-center justify-between text-[10px] text-obs-text-muted mb-1">
                <span className="flex items-center gap-1"><Network className="w-3 h-3 text-obs-accent" /> Net In</span>
                <span className="font-mono font-bold text-obs-text-primary">{(rxVal / (1024 * 1024)).toFixed(2)} MB/s</span>
              </div>
              <div className="text-[9px] text-obs-text-muted truncate">
                {(rxVal / 1024).toFixed(0)} KB/s throughput
              </div>
            </div>

            {/* Network TX */}
            <div className="p-2.5 rounded border border-obs-border bg-obs-bg-secondary/50">
              <div className="flex items-center justify-between text-[10px] text-obs-text-muted mb-1">
                <span className="flex items-center gap-1"><Network className="w-3 h-3 text-obs-accent" /> Net Out</span>
                <span className="font-mono font-bold text-obs-text-primary">{(txVal / (1024 * 1024)).toFixed(2)} MB/s</span>
              </div>
              <div className="text-[9px] text-obs-text-muted truncate">
                {(txVal / 1024).toFixed(0)} KB/s throughput
              </div>
            </div>

            {/* Host Tag */}
            <div className="p-2.5 rounded border border-obs-border bg-obs-bg-secondary/50 flex flex-col justify-between">
              <div className="text-[10px] text-obs-text-muted">Target Host</div>
              <div className="text-xs font-semibold text-obs-text-primary truncate">
                {detection?.host_id ?? 'windows-host'}
              </div>
              <div className="text-[9px] text-obs-healthy flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Prometheus Live
              </div>
            </div>
          </div>
        </div>

        {/* Contributing Factors & Model Explanation */}
        <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-obs-border/60 pb-2">
              <Brain className="w-4 h-4 text-obs-accent" />
              Inference Rationale & Evidence
            </h3>

            <p className="text-xs text-obs-text-secondary leading-relaxed">
              {detection?.explanation ?? 'Waiting for real-time telemetry observation...'}
            </p>

            {/* Contributing factors badges */}
            {detection?.contributing_metrics && detection.contributing_metrics.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="text-[10px] text-obs-text-muted uppercase tracking-wider">Identified Drivers:</div>
                <div className="flex flex-wrap gap-1.5">
                  {detection.contributing_metrics.map((metric, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[10px] rounded border border-obs-warning/40 bg-obs-warning/10 text-obs-warning font-mono"
                    >
                      {metric}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-obs-text-muted border-t border-obs-border/60 pt-2">
            Model: <span className="text-obs-text-primary font-mono">{detection?.model_version ?? 'N/A'}</span> | Host: {detection?.host_id ?? 'windows-host'}
          </div>
        </div>
      </div>
    </div>
  );
};
