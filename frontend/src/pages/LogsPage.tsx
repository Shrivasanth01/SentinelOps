import React, { useState } from 'react';
import {
  Terminal,
  Search,
  Play,
  Pause,
  PlusCircle,
  RefreshCw,
  Copy,
  Check,
  Filter,
} from 'lucide-react';
import { useLogs } from '../hooks/useLogs';
import { LogLevel } from '../types/logs';

interface LogsPageProps {
  backendConnected?: boolean;
}

export const LogsPage: React.FC<LogsPageProps> = ({
  backendConnected = true,
}) => {
  const {
    logs,
    totalCount,
    levelFilter,
    setLevelFilter,
    serviceFilter,
    setServiceFilter,
    searchQuery,
    setSearchQuery,
    isAutoScroll,
    setIsAutoScroll,
    refresh,
    emitSimulatedLog,
  } = useLogs(3000, backendConnected);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-obs-critical/20 text-obs-critical border-obs-critical/40';
      case 'ERROR':
        return 'bg-obs-critical/10 text-obs-critical border-obs-critical/30';
      case 'WARNING':
        return 'bg-obs-warning/10 text-obs-warning border-obs-warning/30';
      case 'INFO':
        return 'bg-obs-accent/10 text-obs-accent border-obs-accent/30';
      case 'DEBUG':
      default:
        return 'bg-obs-surface text-obs-text-muted border-obs-border';
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text-primary">
                Technical Log Exploration Terminal
              </h1>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-obs-healthy/15 border border-obs-healthy/30 text-obs-healthy">
                LIVE INGESTION ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              Structured event pipeline, real-time query engine, and auto-tailing console
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() =>
              emitSimulatedLog(
                'WARNING',
                'gateway-proxy',
                'Transient downstream latency spike (+420ms) detected on /api/v1/telemetry'
              )
            }
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors text-[11px]"
            title="Dispatch simulated diagnostic warning"
          >
            <PlusCircle className="w-3.5 h-3.5 text-obs-accent" />
            <span>Emit Test Probe</span>
          </button>

          <button
            onClick={refresh}
            className="p-1.5 rounded border border-obs-border bg-obs-panel hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors"
            title="Refresh stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Control Strip: Filtering, Search & Auto-tail */}
      <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/80 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Message Box */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-obs-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query logs (regex, keyword, correlation ID)..."
                className="w-full rounded border border-obs-border bg-obs-bg pl-8 pr-3 py-1.5 text-obs-text-primary placeholder-obs-text-muted focus:outline-none focus:border-obs-accent text-xs font-mono"
              />
            </div>

            {/* Service Filter */}
            <input
              type="text"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              placeholder="Filter by service..."
              className="w-40 rounded border border-obs-border bg-obs-bg px-2.5 py-1.5 text-obs-text-primary placeholder-obs-text-muted focus:outline-none focus:border-obs-accent text-xs font-mono"
            />
          </div>

          {/* Auto-tail Button & Count */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-mono transition-colors ${
                isAutoScroll
                  ? 'border-obs-accent/40 bg-obs-accent/15 text-obs-accent'
                  : 'border-obs-border bg-obs-bg text-obs-text-muted hover:text-obs-text-primary'
              }`}
            >
              {isAutoScroll ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Auto-Tail ON</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Auto-Tail OFF</span>
                </>
              )}
            </button>

            <span className="text-xs text-obs-text-muted">
              INGESTED: <span className="text-obs-text-primary font-bold">{totalCount}</span>
            </span>
          </div>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-obs-border/50 text-[11px] overflow-x-auto">
          <span className="text-obs-text-muted mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            SEVERITY:
          </span>
          {(['ALL', 'CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'] as const).map((level) => {
            const isSelected = (level === 'ALL' && !levelFilter) || levelFilter === level;
            return (
              <button
                key={level}
                onClick={() => setLevelFilter(level === 'ALL' ? undefined : (level as LogLevel))}
                className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase transition-colors ${
                  isSelected
                    ? 'border-obs-accent/50 bg-obs-accent/20 text-obs-accent font-bold'
                    : 'border-obs-border/70 bg-obs-bg text-obs-text-muted hover:text-obs-text-primary'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="rounded-lg border border-obs-border bg-obs-bg font-mono text-xs overflow-hidden shadow-2xl">
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-obs-border/70 bg-obs-bg-secondary/70">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-obs-critical/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-obs-warning/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-obs-healthy/80 inline-block" />
            <span className="text-[11px] text-obs-text-muted ml-2">
              sentinelops@observatory:/var/log/pipeline (stdout/stderr)
            </span>
          </div>
          <span className="text-[10px] text-obs-text-muted">
            Buffer: {logs.length} lines shown
          </span>
        </div>

        {/* Terminal Rows */}
        <div className="divide-y divide-obs-border/40 max-h-[580px] overflow-y-auto p-1 bg-obs-bg/95">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-obs-text-muted space-y-1">
              <Terminal className="w-8 h-8 mx-auto text-obs-text-muted/40" />
              <p className="text-xs">No log frames matched the active query filter.</p>
              <p className="text-[11px]">Emit a test probe or adjust search parameters.</p>
            </div>
          ) : (
            logs.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="px-2.5 py-1.5 flex items-start gap-2.5 hover:bg-obs-surface/40 group transition-colors text-[11px]"
                >
                  {/* Timestamp */}
                  <span className="text-obs-text-muted shrink-0 text-[10px] pt-0.5">
                    {dateStr}
                  </span>

                  {/* Level Pill */}
                  <span
                    className={`px-1.5 py-0.2 rounded border text-[9px] uppercase font-bold shrink-0 ${getLevelBadge(
                      log.level
                    )}`}
                  >
                    {log.level}
                  </span>

                  {/* Service */}
                  <span className="text-obs-accent shrink-0 font-semibold text-[10px]">
                    [{log.service}]
                  </span>

                  {/* Log Message */}
                  <span className="text-obs-text-primary flex-1 break-all font-mono leading-relaxed">
                    {log.message}
                  </span>

                  {/* Copy Action */}
                  <button
                    onClick={() => handleCopy(log.id, `${log.timestamp} [${log.level}] [${log.service}] ${log.message}`)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-obs-text-muted hover:text-obs-text-primary transition-opacity shrink-0"
                    title="Copy log entry"
                  >
                    {copiedId === log.id ? (
                      <Check className="w-3 h-3 text-obs-healthy" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
