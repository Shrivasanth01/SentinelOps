import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, ArrowDown, Activity, Copy, Check } from 'lucide-react';
import { LogEntry, LogLevel } from '../../types/logs';

interface LogStreamProps {
  logs: LogEntry[];
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onSelectLog: (log: LogEntry) => void;
}

export const LogStream: React.FC<LogStreamProps> = ({
  logs,
  isStreaming,
  onToggleStreaming,
  onSelectLog,
}) => {
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const streamBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && streamBottomRef.current) {
      streamBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

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

  // Reverse so oldest is at top, newest at bottom like a live terminal tail
  const streamLogs = [...logs].reverse();

  return (
    <div className="flex flex-col h-[650px] bg-[#080B12] border border-[#243247] rounded overflow-hidden font-mono">
      {/* Stream Controls Toolbar */}
      <div className="px-4 py-2.5 bg-[#0D1420] border-b border-[#243247] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isStreaming ? 'bg-[#36D399] animate-pulse' : 'bg-[#8B949E]'}`} />
            <span className="font-semibold text-[#E6EDF3] tracking-wider">LIVE TELEMETRY STREAM</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 bg-[#162235] text-[#58A6FF] border border-[#2A3C56] rounded">
            TAIL ({logs.length} BUFF)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Pause / Resume Button */}
          <button
            onClick={onToggleStreaming}
            className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-colors border ${
              isStreaming
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'PAUSE TAIL' : 'RESUME TAIL'}</span>
          </button>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 border transition-colors ${
              autoScroll
                ? 'bg-[#162235] text-[#58A6FF] border-[#2A3C56]'
                : 'bg-[#101724] text-[#8B949E] border-[#212E42]'
            }`}
            title="Auto-scroll on new incoming logs"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>LOCK</span>
          </button>
        </div>
      </div>

      {/* Terminal Feed Output */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs select-text">
        {streamLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#8B949E]">
            Waiting for real-time telemetry stream packets...
          </div>
        ) : (
          streamLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => onSelectLog(log)}
              className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-[#111B29] cursor-pointer group transition-colors border border-transparent hover:border-[#22334A]"
            >
              {/* Timestamp */}
              <span className="text-[#8B949E] text-[11px] whitespace-nowrap pt-0.5">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>

              {/* Level Badge */}
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold border rounded uppercase whitespace-nowrap ${getLevelColor(
                  log.level
                )}`}
              >
                {log.level}
              </span>

              {/* Service & Channel */}
              <span className="text-[#58A6FF] font-medium whitespace-nowrap text-[11px] pt-0.5">
                [{log.service}]
              </span>

              {/* Message Payload */}
              <span className="flex-1 text-[#C9D1D9] text-[11px] break-all pt-0.5 group-hover:text-[#E6EDF3]">
                {log.message}
              </span>

              {/* Quick Copy Action */}
              <button
                onClick={(e) => handleCopy(e, log.id, log.raw || log.message)}
                className="opacity-0 group-hover:opacity-100 text-[#8B949E] hover:text-[#E6EDF3] p-1 transition-opacity"
                title="Copy log text"
              >
                {copiedId === log.id ? (
                  <Check className="w-3.5 h-3.5 text-[#36D399]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))
        )}
        <div ref={streamBottomRef} />
      </div>

      {/* Footer bar */}
      <div className="px-3 py-1.5 bg-[#0D1420] border-t border-[#243247] flex justify-between items-center text-[11px] text-[#8B949E]">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-[#36D399]" />
          <span>Stream Cadence: 2.5s ring-poll</span>
        </span>
        <span>Click row for deep inspection drawer</span>
      </div>
    </div>
  );
};
