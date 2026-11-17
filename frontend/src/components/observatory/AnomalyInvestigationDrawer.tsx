import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FileText,
  Brain,
  ShieldAlert,
} from 'lucide-react';
import { AnomalyEvent } from '../../types/ml';
import { logService } from '../../services/logService';
import { LogEntry } from '../../types/logs';

interface AnomalyInvestigationDrawerProps {
  anomaly: AnomalyEvent | null;
  onClose: () => void;
  onAcknowledge: (id: string, notes: string, operator: string) => Promise<void>;
}

export const AnomalyInvestigationDrawer: React.FC<AnomalyInvestigationDrawerProps> = ({
  anomaly,
  onClose,
  onAcknowledge,
}) => {
  const [operator, setOperator] = useState<string>('Site Reliability Engineer');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [correlatedLogs, setCorrelatedLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  useEffect(() => {
    if (anomaly) {
      setNotes(anomaly.investigation_notes || '');
      setOperator(anomaly.acknowledged_by || 'Site Reliability Engineer');

      // Fetch correlated logs
      const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
          const res = await logService.getLogs({ limit: 10 });
          if (res.data?.logs) {
            setCorrelatedLogs(res.data.logs);
          }
        } catch (err) {
          console.error('Failed to fetch correlated logs:', err);
        } finally {
          setLoadingLogs(false);
        }
      };
      fetchLogs();
    }
  }, [anomaly]);

  if (!anomaly) return null;

  const handleAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAcknowledge(anomaly.id, notes, operator);
      onClose();
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-obs-critical/20 text-obs-critical border-obs-critical/40';
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

  const snapshot = anomaly.feature_snapshot || {};

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-obs-panel border-l border-obs-border shadow-2xl flex flex-col justify-between animate-slideInRight font-mono">
      {/* Drawer Header */}
      <div className="p-4 border-b border-obs-border/60 flex items-center justify-between bg-obs-panel/90 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider">
                Anomaly Deep Investigation
              </h3>
              <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${getSeverityBadge(anomaly.severity)}`}>
                {anomaly.severity}
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted truncate max-w-sm">
              Event ID: {anomaly.id}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-obs-text-muted hover:text-obs-text-primary p-1 rounded hover:bg-obs-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Model Attribution Metadata */}
        <div className="p-3 rounded-lg border border-obs-border bg-obs-bg-secondary/40 space-y-2">
          <div className="text-[10px] uppercase text-obs-text-muted font-semibold tracking-wider flex items-center gap-1.5 border-b border-obs-border/40 pb-1.5">
            <Brain className="w-3.5 h-3.5 text-obs-accent" />
            Detection Pipeline Attribution
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-obs-text-muted">Timestamp:</span>{' '}
              <span className="text-obs-text-primary">{new Date(anomaly.timestamp).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-obs-text-muted">Target Host:</span>{' '}
              <span className="text-obs-text-primary">{anomaly.host_id}</span>
            </div>
            <div>
              <span className="text-obs-text-muted">Model Version:</span>{' '}
              <span className="text-obs-accent font-mono">{anomaly.model_version || 'N/A'}</span>
            </div>
            <div>
              <span className="text-obs-text-muted">Normalized Risk Score:</span>{' '}
              <span className="text-obs-critical font-bold">{(anomaly.score * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Feature Snapshot */}
        <div className="p-3 rounded-lg border border-obs-border bg-obs-bg-secondary/40 space-y-2">
          <div className="text-[10px] uppercase text-obs-text-muted font-semibold tracking-wider flex items-center justify-between border-b border-obs-border/40 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-obs-accent" />
              Recorded Feature Snapshot
            </span>
            <span className="text-[9px] text-obs-text-muted">At trigger frame</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(snapshot).map(([key, val]) => (
              <div key={key} className="p-1.5 rounded bg-obs-panel border border-obs-border/40 text-[11px]">
                <div className="text-[10px] text-obs-text-muted truncate">{key}</div>
                <div className="font-mono font-bold text-obs-text-primary">
                  {typeof val === 'number'
                    ? key.includes('percent')
                      ? `${val.toFixed(1)}%`
                      : key.includes('bytes')
                      ? `${(val / (1024 * 1024)).toFixed(2)} MB/s`
                      : val.toFixed(2)
                    : String(val)}
                </div>
              </div>
            ))}
          </div>

          {/* Key Drivers */}
          {anomaly.contributing_metrics && anomaly.contributing_metrics.length > 0 && (
            <div className="pt-2 border-t border-obs-border/30 space-y-1">
              <span className="text-[10px] text-obs-text-muted">Primary Metric Deviations:</span>
              <div className="flex flex-wrap gap-1">
                {anomaly.contributing_metrics.map((m, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[10px] bg-obs-warning/15 text-obs-warning border border-obs-warning/30 font-semibold"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Log Correlation Panel with Causation Disclaimer */}
        <div className="p-3 rounded-lg border border-obs-border bg-obs-bg-secondary/40 space-y-2.5">
          <div className="text-[10px] uppercase text-obs-text-muted font-semibold tracking-wider flex items-center gap-1.5 border-b border-obs-border/40 pb-1.5">
            <FileText className="w-3.5 h-3.5 text-obs-accent" />
            Correlated Infrastructure Logs (±5 min Window)
          </div>

          {/* Causation Disclaimer Alert */}
          <div className="p-2.5 rounded border border-obs-warning/40 bg-obs-warning/10 text-[11px] text-obs-text-secondary space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-obs-warning">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Statistical Correlation vs Proven Causation Notice</span>
            </div>
            <p className="text-[10px] leading-relaxed text-obs-text-muted">
              Log events occurring within this temporal window demonstrate statistical concurrence with the telemetry anomaly, not verified root-cause causation. Operator manual inspection is required.
            </p>
          </div>

          {/* Correlated Log lines */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {loadingLogs ? (
              <div className="py-4 text-center text-[11px] text-obs-text-muted">
                Correlating Loki and Windows event logs...
              </div>
            ) : correlatedLogs.length > 0 ? (
              correlatedLogs.slice(0, 5).map(log => (
                <div
                  key={log.id}
                  className="p-1.5 rounded bg-obs-panel border border-obs-border/30 text-[10px] font-mono space-y-0.5"
                >
                  <div className="flex items-center justify-between text-obs-text-muted text-[9px]">
                    <span>{new Date(log.timestamp).toLocaleTimeString()} [{log.service}]</span>
                    <span className={log.level === 'ERROR' ? 'text-obs-critical' : 'text-obs-accent'}>{log.level}</span>
                  </div>
                  <div className="text-obs-text-secondary truncate">{log.message}</div>
                </div>
              ))
            ) : (
              <div className="py-3 text-center text-[10px] text-obs-text-muted">
                No correlated error logs found in window.
              </div>
            )}
          </div>
        </div>

        {/* Operator Acknowledgment Form */}
        <form onSubmit={handleAcknowledge} className="p-3 rounded-lg border border-obs-border bg-obs-bg-secondary/40 space-y-3">
          <div className="text-[10px] uppercase text-obs-text-muted font-semibold tracking-wider flex items-center gap-1.5 border-b border-obs-border/40 pb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-obs-healthy" />
            Operator Resolution & Notes
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-obs-text-muted">Acknowledged By</label>
            <input
              type="text"
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className="w-full px-2 py-1 rounded border border-obs-border bg-obs-panel text-obs-text-primary text-xs focus:outline-none focus:border-obs-accent"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-obs-text-muted">Investigation Findings / Remediation Notes</label>
            <textarea
              rows={3}
              placeholder="Detail root cause verification, operator actions taken, or false-positive analysis..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-2 py-1 rounded border border-obs-border bg-obs-panel text-obs-text-primary text-xs focus:outline-none focus:border-obs-accent"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 px-3 rounded border border-obs-healthy/40 bg-obs-healthy/20 hover:bg-obs-healthy/30 text-obs-healthy font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Recording Acknowledgment...' : 'Acknowledge Anomaly'}</span>
          </button>
        </form>
      </div>

      {/* Drawer Footer */}
      <div className="p-3 border-t border-obs-border/60 bg-obs-panel/90 backdrop-blur-sm flex justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded border border-obs-border bg-obs-bg-secondary text-obs-text-secondary hover:text-obs-text-primary transition-colors text-xs"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
};
