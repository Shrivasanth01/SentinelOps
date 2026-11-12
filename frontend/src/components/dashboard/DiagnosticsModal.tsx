import React, { useState } from 'react';
import { X, Copy, Check, Terminal } from 'lucide-react';
import { HealthState } from '../../hooks/useHealth';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  healthState: HealthState;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  healthState,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'liveness' | 'readiness' | 'system' | 'config'>('liveness');

  if (!isOpen) return null;

  const payload = {
    timestamp: new Date().toISOString(),
    telemetry: healthState.telemetry,
    backendConnected: healthState.backendConnected,
    databaseConnected: healthState.databaseConnected,
    liveness: healthState.liveness,
    readiness: healthState.readiness,
    systemInfo: healthState.systemInfo,
    configSummary: healthState.configSummary,
  };

  const getActiveContent = () => {
    switch (activeTab) {
      case 'liveness':
        return JSON.stringify(healthState.liveness, null, 2) || '// No liveness telemetry';
      case 'readiness':
        return JSON.stringify(healthState.readiness, null, 2) || '// No readiness telemetry';
      case 'system':
        return JSON.stringify(healthState.systemInfo, null, 2) || '// No system info data';
      case 'config':
        return JSON.stringify(healthState.configSummary, null, 2) || '// No config summary data';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obs-bg/80 backdrop-blur-sm font-mono">
      <div className="relative w-full max-w-3xl rounded-lg border border-obs-border bg-obs-panel shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-obs-border bg-obs-bg-secondary/90">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-obs-text-primary text-xs uppercase tracking-wider">
                Telemetry Diagnostics Explorer
              </h3>
              <p className="text-[10px] text-obs-text-muted">
                HTTP payload & kernel response introspection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-obs-surface hover:bg-obs-surface/80 text-obs-text-secondary hover:text-obs-text-primary text-[11px] border border-obs-border transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-obs-healthy" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-obs-surface text-obs-text-muted hover:text-obs-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagnostic Meta Header */}
        <div className="px-4 py-2 bg-obs-bg border-b border-obs-border/70 flex items-center gap-4 text-[11px] text-obs-text-muted flex-wrap">
          <div>
            <span>Correlation ID: </span>
            <span className="text-obs-accent font-semibold">{healthState.telemetry.correlationId || 'N/A'}</span>
          </div>
          <div>
            <span>Roundtrip Latency: </span>
            <span className="text-obs-healthy font-semibold">{healthState.telemetry.responseTimeMs || 0} ms</span>
          </div>
          <div>
            <span>Gateway: </span>
            <span className={healthState.backendConnected ? 'text-obs-healthy' : 'text-obs-critical'}>
              {healthState.backendConnected ? 'ONLINE' : 'UNREACHABLE'}
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-obs-border px-4 gap-2 bg-obs-bg-secondary/40 pt-2">
          {(['liveness', 'readiness', 'system', 'config'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-t transition-colors uppercase ${
                activeTab === tab
                  ? 'bg-obs-panel text-obs-accent border-t-2 border-obs-accent font-bold'
                  : 'text-obs-text-muted hover:text-obs-text-secondary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* JSON Viewer Viewport */}
        <div className="flex-1 p-4 overflow-y-auto bg-obs-bg font-mono text-xs text-obs-text-secondary leading-relaxed select-text">
          <pre className="text-obs-accent/90 whitespace-pre-wrap">{getActiveContent()}</pre>
        </div>
      </div>
    </div>
  );
};
