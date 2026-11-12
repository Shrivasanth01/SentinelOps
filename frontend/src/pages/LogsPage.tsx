import React, { useState } from 'react';
import { Terminal, Search, Play, Pause, PlusCircle, RefreshCw, Copy, Check } from 'lucide-react';
import { useLogs } from '../hooks/useLogs';
import { LogLevel } from '../types/logs';

export const LogsPage: React.FC = () => {
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
  } = useLogs(3000, true);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'INFO':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'DEBUG':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Log Aggregator & Streams</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Phase 3 Live
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time structured event ingestion, search query engine, and live tailing stream.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => emitSimulatedLog('WARNING', 'auth-service', 'Transient OAuth token refresh delay (+840ms)')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-700 bg-navy-850 hover:bg-navy-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5 text-blue-400" />
            <span>Emit Test Event</span>
          </button>

          <button
            onClick={refresh}
            className="p-2 rounded-lg bg-navy-850 border border-navy-800 hover:bg-navy-800 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Control Bar: Filters & Live Tail Toggle */}
      <div className="rounded-2xl border border-navy-800 bg-navy-900/80 p-4 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 font-mono text-xs">
        {/* Search & Service Input */}
        <div className="flex flex-col sm:flex-row gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search message text (regex/keyword)..."
              className="w-full rounded-xl border border-navy-700 bg-navy-950 pl-9 pr-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <input
            type="text"
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            placeholder="Service name..."
            className="w-full sm:w-36 rounded-xl border border-navy-700 bg-navy-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setLevelFilter(undefined)}
            className={`px-3 py-1.5 rounded-lg border transition-all ${
              !levelFilter
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-navy-850 text-slate-400 border-navy-700 hover:border-slate-500'
            }`}
          >
            ALL
          </button>
          {(['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(levelFilter === lvl ? undefined : lvl)}
              className={`px-2.5 py-1.5 rounded-lg border transition-all ${
                levelFilter === lvl
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-navy-850 text-slate-400 border-navy-700 hover:border-slate-500'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Auto Tail Toggle */}
        <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-navy-800 pt-3 md:pt-0 md:pl-4">
          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
              isAutoScroll
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-navy-850 text-slate-400 border-navy-700'
            }`}
          >
            {isAutoScroll ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{isAutoScroll ? 'Auto-Tail: ON' : 'Paused'}</span>
          </button>
          <span className="text-slate-500 text-[11px] whitespace-nowrap">
            {totalCount} events
          </span>
        </div>
      </div>

      {/* Terminal View Container */}
      <div className="rounded-2xl border border-navy-800 bg-navy-950 p-4 shadow-2xl font-mono text-xs overflow-hidden flex flex-col min-h-[500px] max-h-[700px]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-navy-800/80 text-slate-500 text-[11px]">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-blue-400" />
            <span className="text-slate-300 font-semibold">syslog://sentinel-nodes</span>
          </div>
          <span>Buffer: last 500 events</span>
        </div>

        {/* Logs Stream */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 selection:bg-blue-500/30">
          {logs.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              No matching log events found. Emit a test event or clear filters.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="group flex items-start gap-3 p-2 rounded-lg hover:bg-navy-900/60 transition-colors border border-transparent hover:border-navy-800"
              >
                <span className="text-slate-500 whitespace-nowrap text-[11px] mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getLevelBadge(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>

                <span className="px-1.5 py-0.5 rounded bg-navy-850 text-blue-400 border border-navy-800 text-[11px] whitespace-nowrap font-semibold">
                  {log.service}
                </span>

                <span className="flex-1 text-slate-300 break-words leading-relaxed">
                  {log.message}
                </span>

                <button
                  onClick={() => handleCopy(log.id, `[${log.timestamp}] [${log.level}] [${log.service}] ${log.message}`)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-navy-800 text-slate-500 hover:text-slate-200 transition-all flex-shrink-0"
                  title="Copy log entry"
                >
                  {copiedId === log.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
