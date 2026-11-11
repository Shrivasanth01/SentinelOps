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
        return JSON.stringify(healthState.liveness, null, 2) || '// No liveness data';
      case 'readiness':
        return JSON.stringify(healthState.readiness, null, 2) || '// No readiness data';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-navy-700 bg-navy-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-950/80">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white text-base">SentinelOps Diagnostics Explorer</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-white text-xs font-mono border border-navy-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy All JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-navy-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Diagnostic Meta Header */}
        <div className="px-6 py-3 bg-navy-950/50 border-b border-navy-800 flex items-center gap-4 text-xs font-mono text-slate-400 flex-wrap">
          <div>
            <span className="text-slate-400">Correlation ID: </span>
            <span className="text-blue-300">{healthState.telemetry.correlationId || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400">Roundtrip: </span>
            <span className="text-emerald-400">{healthState.telemetry.responseTimeMs || 0} ms</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-navy-800 px-6 gap-2 bg-navy-900 pt-3">
          {(['liveness', 'readiness', 'system', 'config'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-xs font-mono font-medium rounded-t-lg transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-navy-800 text-blue-400 border-t-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'config' ? 'Config Summary' : tab}
            </button>
          ))}
        </div>

        {/* Body Payload */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs">
          <pre className="p-4 rounded-xl bg-navy-950 border border-navy-800 text-slate-300 leading-relaxed overflow-x-auto selection:bg-blue-500/20">
            {getActiveContent()}
          </pre>
        </div>
      </div>
    </div>
  );
};
