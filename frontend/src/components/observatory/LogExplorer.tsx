import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Database,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { LogEntry, LogLevel } from '../../types/logs';

interface LogExplorerProps {
  logs: LogEntry[];
  totalCount: number;
  isLoading: boolean;
  lokiConnected: boolean;
  executionTimeMs: number;
  timeRange: string;
  setTimeRange: (val: string) => void;
  levelFilter: LogLevel | 'ALL';
  setLevelFilter: (val: LogLevel | 'ALL') => void;
  serviceFilter: string;
  setServiceFilter: (val: string) => void;
  sourceFilter: string;
  setSourceFilter: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onSelectLog: (log: LogEntry) => void;
  onRefresh: () => void;
}

const SEVERITY_LEVELS: (LogLevel | 'ALL')[] = ['ALL', 'CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'];
const TIME_RANGES = ['15m', '1h', '6h', '24h', '7d'];
const SOURCE_TYPES = ['ALL SOURCES', 'WINDOWS_EVENT', 'APPLICATION_LOG', 'CONTAINER_LOG', 'FILE'];

export const LogExplorer: React.FC<LogExplorerProps> = ({
  logs,
  totalCount,
  isLoading,
  lokiConnected,
  executionTimeMs,
  timeRange,
  setTimeRange,
  levelFilter,
  setLevelFilter,
  serviceFilter,
  setServiceFilter,
  sourceFilter,
  setSourceFilter,
  searchQuery,
  setSearchQuery,
  onSelectLog,
  onRefresh,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-[#FF5555] bg-[#FF5555]/10 border-[#FF5555]/30';
      case 'ERROR':
        return 'text-[#FF5555] bg-[#FF5555]/10 border-[#FF5555]/30';
      case 'WARNING':
        return 'text-[#F5B942] bg-[#F5B942]/10 border-[#F5B942]/30';
      case 'INFO':
        return 'text-[#58A6FF] bg-[#58A6FF]/10 border-[#58A6FF]/30';
      case 'DEBUG':
        return 'text-[#8B949E] bg-[#8B949E]/10 border-[#8B949E]/30';
      default:
        return 'text-[#8B949E] bg-[#8B949E]/10 border-[#8B949E]/30';
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Search & Query Control Console */}
      <div className="p-4 bg-[#0D1420] border border-[#243247] rounded space-y-3">
        {/* Row 1: Search Input & Time Range */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8B949E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search logs or filter (e.g. "timeout", "failed", LogQL |= "error")...'
              className="w-full pl-9 pr-3 py-2 bg-[#080B12] border border-[#243247] rounded text-[#E6EDF3] placeholder-[#8B949E]/60 focus:outline-none focus:border-[#58A6FF]"
            />
          </div>

          {/* Time range buttons */}
          <div className="flex items-center gap-1 bg-[#080B12] p-1 border border-[#243247] rounded">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr}
                onClick={() => setTimeRange(tr)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  timeRange === tr
                    ? 'bg-[#1F2E45] text-[#58A6FF] font-semibold border border-[#344A6E]'
                    : 'text-[#8B949E] hover:text-[#C9D1D9]'
                }`}
              >
                {tr}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            className="px-3 py-2 bg-[#162235] hover:bg-[#1E2E47] border border-[#283850] rounded text-[#C9D1D9] flex items-center justify-center gap-1.5 transition-colors"
            title="Refresh logs query"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>RUN</span>
          </button>
        </div>

        {/* Row 2: Severity Filters & Pipelines */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1C2738]">
          {/* Level Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#8B949E] text-[11px] mr-1">LEVEL:</span>
            {SEVERITY_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                  levelFilter === lvl
                    ? lvl === 'CRITICAL' || lvl === 'ERROR'
                      ? 'bg-red-500/20 text-red-400 border-red-500/50'
                      : lvl === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                      : lvl === 'INFO'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                      : 'bg-slate-500/20 text-slate-300 border-slate-500/50'
                    : 'bg-[#080B12] text-[#8B949E] border-[#243247] hover:border-[#384D6D]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Source and Service selectors */}
          <div className="flex items-center gap-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value === 'ALL SOURCES' ? '' : e.target.value)}
              className="px-2.5 py-1 bg-[#080B12] border border-[#243247] rounded text-[#C9D1D9] text-[11px] focus:outline-none focus:border-[#58A6FF]"
            >
              {SOURCE_TYPES.map((src) => (
                <option key={src} value={src === 'ALL SOURCES' ? '' : src}>
                  {src}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              placeholder="Service..."
              className="w-28 px-2.5 py-1 bg-[#080B12] border border-[#243247] rounded text-[#C9D1D9] text-[11px] placeholder-[#8B949E]/60 focus:outline-none focus:border-[#58A6FF]"
            />
          </div>
        </div>
      </div>

      {/* Query Status Banner */}
      <div className="flex justify-between items-center text-[11px] text-[#8B949E] px-1">
        <div className="flex items-center gap-3">
          <span>
            Found <strong className="text-[#E6EDF3]">{totalCount.toLocaleString()}</strong> events
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#58A6FF]" /> {executionTimeMs}ms
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-[#36D399]" />
            <span>
              Loki:{' '}
              <strong className={lokiConnected ? 'text-[#36D399]' : 'text-amber-400'}>
                {lokiConnected ? 'ONLINE (TSDB)' : 'FALLBACK BUFFER'}
              </strong>
            </span>
          </span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#080B12] border border-[#243247] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F1726] border-b border-[#243247] text-[#8B949E] text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 w-40">TIMESTAMP (UTC)</th>
                <th className="py-2.5 px-3 w-24">SEVERITY</th>
                <th className="py-2.5 px-3 w-36">SERVICE</th>
                <th className="py-2.5 px-3 w-32">SOURCE</th>
                <th className="py-2.5 px-3">MESSAGE PAYLOAD</th>
                <th className="py-2.5 px-3 w-16 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2536] text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8B949E]">
                    {isLoading ? 'Querying centralized log telemetry...' : 'No matching log events found for active filters.'}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className="hover:bg-[#111B29] cursor-pointer group transition-colors"
                  >
                    <td className="py-2 px-3 text-[#8B949E] whitespace-nowrap">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 font-bold border rounded uppercase ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#58A6FF] font-medium whitespace-nowrap">
                      {log.service}
                    </td>
                    <td className="py-2 px-3 text-[#8B949E] whitespace-nowrap">
                      {log.source || 'APPLICATION_LOG'}
                    </td>
                    <td className="py-2 px-3 text-[#C9D1D9] truncate max-w-xl group-hover:text-[#E6EDF3]">
                      {log.message}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => handleCopy(e, log.id, log.raw || log.message)}
                        className="p-1 text-[#8B949E] hover:text-[#E6EDF3] rounded transition-colors inline-block"
                        title="Copy log text"
                      >
                        {copiedId === log.id ? (
                          <Check className="w-3.5 h-3.5 text-[#36D399]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
