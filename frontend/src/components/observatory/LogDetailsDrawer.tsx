import React, { useEffect } from 'react';
import { X, Copy, Check, Terminal, Shield, Hash, Server, FileText } from 'lucide-react';
import { LogEntry, LogLevel } from '../../types/logs';

interface LogDetailsDrawerProps {
  log: LogEntry | null;
  onClose: () => void;
}

export const LogDetailsDrawer: React.FC<LogDetailsDrawerProps> = ({ log, onClose }) => {
  const [copiedRaw, setCopiedRaw] = React.useState(false);
  const [copiedJson, setCopiedJson] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!log) return null;

  const handleCopyRaw = () => {
    const payload = log.raw || log.message;
    navigator.clipboard.writeText(payload);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getLevelBadgeClass = (lvl: LogLevel) => {
    switch (lvl) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'ERROR':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'INFO':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'DEBUG':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-[#0B111D] border-l border-[#243247] shadow-2xl flex flex-col h-full animate-slide-left">
        {/* Header */}
        <div className="p-4 border-b border-[#243247] flex items-center justify-between bg-[#0F1726]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1A2638] rounded border border-[#2B3D57]">
              <Terminal className="w-4 h-4 text-[#58A6FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#8B949E]">RECORD ID:</span>
                <span className="text-xs font-mono font-medium text-[#E6EDF3]">{log.id}</span>
              </div>
              <p className="text-[11px] text-[#8B949E] flex items-center gap-2 mt-0.5">
                <span>{new Date(log.timestamp).toLocaleString()}</span>
                <span>•</span>
                <span className="font-mono">{log.service}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="px-2.5 py-1 text-xs font-mono text-[#C9D1D9] bg-[#162235] hover:bg-[#1E2E47] border border-[#2E3F59] rounded flex items-center gap-1.5 transition-colors"
              title="Copy entry as JSON"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-[#36D399]" /> : <Copy className="w-3.5 h-3.5 text-[#8B949E]" />}
              <span>{copiedJson ? 'COPIED' : 'COPY JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#1E2E47] rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 font-mono text-xs">
          {/* Key Indicators Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-[#101928] border border-[#212E42] rounded">
              <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1">Severity</span>
              <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded ${getLevelBadgeClass(log.level)}`}>
                {log.level}
              </span>
            </div>

            <div className="p-2.5 bg-[#101928] border border-[#212E42] rounded">
              <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-[#58A6FF]" /> Event ID
              </span>
              <span className="text-xs text-[#E6EDF3] font-medium">
                {log.event_id !== null && log.event_id !== undefined ? log.event_id : 'N/A'}
              </span>
            </div>

            <div className="p-2.5 bg-[#101928] border border-[#212E42] rounded">
              <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Server className="w-3 h-3 text-[#36D399]" /> Source Pipeline
              </span>
              <span className="text-xs text-[#58A6FF] truncate block">
                {log.source || 'APPLICATION_LOG'}
              </span>
            </div>

            <div className="p-2.5 bg-[#101928] border border-[#212E42] rounded">
              <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-[#E6EDF3]" /> Channel / Target
              </span>
              <span className="text-xs text-[#E6EDF3] truncate block">
                {log.channel_or_file || 'main'}
              </span>
            </div>
          </div>

          {/* Provider & Host metadata */}
          {(log.provider || log.computer || log.correlation_id) && (
            <div className="p-3 bg-[#0E1624] border border-[#212E42] rounded space-y-1.5 text-[11px]">
              {log.provider && (
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">Provider:</span>
                  <span className="text-[#C9D1D9]">{log.provider}</span>
                </div>
              )}
              {log.computer && (
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">Host Node:</span>
                  <span className="text-[#C9D1D9]">{log.computer}</span>
                </div>
              )}
              {log.correlation_id && (
                <div className="flex justify-between">
                  <span className="text-[#8B949E]">Correlation ID:</span>
                  <span className="text-[#58A6FF] font-mono">{log.correlation_id}</span>
                </div>
              )}
            </div>
          )}

          {/* Sanitized Message Payload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#C9D1D9] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#36D399]" /> SANITIZED MESSAGE PAYLOAD
              </span>
              <button
                onClick={handleCopyRaw}
                className="text-[11px] text-[#58A6FF] hover:underline flex items-center gap-1"
              >
                {copiedRaw ? <Check className="w-3 h-3 text-[#36D399]" /> : <Copy className="w-3 h-3" />}
                {copiedRaw ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <div className="p-3.5 bg-[#080D17] border border-[#202E42] rounded text-[#E6EDF3] leading-relaxed break-words whitespace-pre-wrap selection:bg-[#58A6FF]/30">
              {log.message}
            </div>
          </div>

          {/* Structured Metadata / Context */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-[#C9D1D9] block mb-1.5">STRUCTURED METADATA</span>
              <pre className="p-3.5 bg-[#080D17] border border-[#202E42] rounded text-[#36D399] overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Raw Payload if available */}
          {log.raw && (
            <div>
              <span className="text-[11px] font-semibold text-[#8B949E] block mb-1.5">RAW INGESTION STRING</span>
              <pre className="p-3.5 bg-[#080D17] border border-[#202E42] rounded text-[#8B949E] overflow-x-auto text-[11px] break-all whitespace-pre-wrap">
                {log.raw}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0F1726] border-t border-[#243247] flex justify-between items-center text-[11px] text-[#8B949E]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#36D399]" /> Redaction Engine Active
          </span>
          <span>Press ESC to dismiss</span>
        </div>
      </div>
    </div>
  );
};
