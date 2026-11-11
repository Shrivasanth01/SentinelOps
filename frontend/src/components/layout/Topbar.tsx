import React from 'react';
import { RefreshCw, Code2, Server, Clock } from 'lucide-react';
import { TelemetryHeaders } from '../../types/health';

interface TopbarProps {
  currentSection: string;
  environment?: string;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  telemetry: TelemetryHeaders;
  onOpenDiagnostics: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentSection,
  environment = 'development',
  lastUpdated,
  isRefreshing,
  onRefresh,
  telemetry,
  onOpenDiagnostics,
}) => {
  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString();
  };

  return (
    <header className="h-16 border-b border-navy-800 bg-navy-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight text-white capitalize">
          {currentSection.replace('-', ' ')}
        </h1>
        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-navy-800 text-blue-400 border border-navy-700">
          {environment}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Correlation ID preview */}
        {telemetry.correlationId && (
          <button
            onClick={onOpenDiagnostics}
            title="Click to view full request telemetry and diagnostic headers"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy-800/80 border border-navy-700 hover:border-blue-500/40 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Code2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-slate-400">Corr:</span>
            <span className="text-blue-300 font-semibold">
              {telemetry.correlationId.slice(0, 8)}...
            </span>
          </button>
        )}

        {/* Latency badge */}
        {telemetry.responseTimeMs && (
          <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-slate-400 px-2 py-1 bg-navy-800/60 rounded border border-navy-700/60">
            <Server className="h-3 w-3 text-emerald-400" />
            <span>{telemetry.responseTimeMs}ms</span>
          </div>
        )}

        {/* Last sync time */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{formatTime(lastUpdated)}</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh connectivity probes"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-navy-800 text-white text-xs font-medium transition-all shadow-md shadow-blue-600/20"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};

