import React, { useState } from 'react';
import {
  GitCompare,
  ShieldAlert,
} from 'lucide-react';
import { LogCorrelationResponse, LogEntry, LogLevel } from '../../types/logs';
import { LogCorrelationParams } from '../../services/logEngineService';

interface MetricLogCorrelatorProps {
  correlation: LogCorrelationResponse | null;
  isLoading: boolean;
  onRunCorrelation: (params: LogCorrelationParams) => void;
  onSelectLog: (log: LogEntry) => void;
}

const COMMON_METRICS = [
  'cpu_utilization',
  'memory_used_bytes',
  'disk_space_free_bytes',
  'network_receive_bytes',
  'system_load_1m',
];

export const MetricLogCorrelator: React.FC<MetricLogCorrelatorProps> = ({
  correlation,
  isLoading,
  onRunCorrelation,
  onSelectLog,
}) => {
  const [metricName, setMetricName] = useState<string>('cpu_utilization');
  const [windowSeconds, setWindowSeconds] = useState<number>(300);
  const [customTimestamp, setCustomTimestamp] = useState<string>(
    new Date().toISOString().substring(0, 19)
  );

  const handleCorrelate = () => {
    let epoch = Math.floor(new Date(customTimestamp).getTime() / 1000);
    if (isNaN(epoch)) epoch = Math.floor(Date.now() / 1000);

    onRunCorrelation({
      metricName,
      timestamp: epoch,
      windowSeconds,
    });
  };

  const handleSetNow = () => {
    const nowIso = new Date().toISOString().substring(0, 19);
    setCustomTimestamp(nowIso);
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return 'text-[#FF5555] bg-[#FF5555]/10 border-[#FF5555]/30';
      case 'WARNING':
        return 'text-[#F5B942] bg-[#F5B942]/10 border-[#F5B942]/30';
      case 'INFO':
        return 'text-[#58A6FF] bg-[#58A6FF]/10 border-[#58A6FF]/30';
      default:
        return 'text-[#8B949E] bg-[#8B949E]/10 border-[#8B949E]/30';
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Parameters Panel */}
      <div className="p-4 bg-[#0D1420] border border-[#243247] rounded space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EDF3]">
          <GitCompare className="w-4 h-4 text-[#58A6FF]" />
          <span>TEMPORAL METRIC-TO-LOG CORRELATION ENGINE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          {/* Metric Selector */}
          <div>
            <label className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1">
              Metric Name
            </label>
            <select
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#080B12] border border-[#243247] rounded text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
            >
              {COMMON_METRICS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Anomaly Timestamp */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] text-[#8B949E] uppercase tracking-wider">
                Event Timestamp (UTC)
              </label>
              <button
                type="button"
                onClick={handleSetNow}
                className="text-[10px] text-[#58A6FF] hover:underline"
              >
                Use Current Time
              </button>
            </div>
            <input
              type="datetime-local"
              value={customTimestamp}
              onChange={(e) => setCustomTimestamp(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#080B12] border border-[#243247] rounded text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
            />
          </div>

          {/* Time Window */}
          <div>
            <label className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1">
              Investigation Window (±Δt)
            </label>
            <select
              value={windowSeconds}
              onChange={(e) => setWindowSeconds(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-[#080B12] border border-[#243247] rounded text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
            >
              <option value={60}>±1 Minute (120s span)</option>
              <option value={300}>±5 Minutes (600s span)</option>
              <option value={900}>±15 Minutes (1800s span)</option>
              <option value={1800}>±30 Minutes (3600s span)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-[#1C2738]">
          <button
            onClick={handleCorrelate}
            disabled={isLoading}
            className="px-4 py-2 bg-[#162235] hover:bg-[#1E2E47] text-[#58A6FF] border border-[#2B3F5D] rounded font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <GitCompare className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>CORRELATE METRIC WITH LOGS</span>
          </button>
        </div>
      </div>

      {/* Explicit Causation Disclaimer Notice */}
      <div className="p-3 bg-[#111A29] border-l-4 border-l-[#58A6FF] border-[#243247] rounded flex items-start gap-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-[#58A6FF] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#E6EDF3] block mb-0.5">
            Observability Architectural Disclaimer
          </span>
          <p className="text-[#8B949E] leading-relaxed">
            {correlation?.disclaimer ||
              'Temporal proximity demonstrates concurrence within the time window and does not establish a causal relationship. Concurrence must be corroborated with application tracing and architecture topology.'}
          </p>
        </div>
      </div>

      {/* Results View */}
      {correlation && (
        <div className="space-y-3">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 bg-[#0D1420] border border-[#243247] rounded">
              <span className="text-[10px] text-[#8B949E] block mb-1">Target Metric</span>
              <span className="font-semibold text-[#58A6FF]">{correlation.metric_name}</span>
            </div>
            <div className="p-3 bg-[#0D1420] border border-[#243247] rounded">
              <span className="text-[10px] text-[#8B949E] block mb-1">Correlated Logs</span>
              <span className="font-bold text-[#E6EDF3]">{correlation.correlated_count}</span>
            </div>
            <div className="p-3 bg-[#0D1420] border border-[#243247] rounded">
              <span className="text-[10px] text-[#8B949E] block mb-1">Correlated Errors</span>
              <span className="font-bold text-[#FF5555]">{correlation.error_count}</span>
            </div>
            <div className="p-3 bg-[#0D1420] border border-[#243247] rounded">
              <span className="text-[10px] text-[#8B949E] block mb-1">Correlated Warnings</span>
              <span className="font-bold text-[#F5B942]">{correlation.warning_count}</span>
            </div>
          </div>

          {/* Log Stream in Window */}
          <div className="bg-[#080B12] border border-[#243247] rounded overflow-hidden">
            <div className="p-3 bg-[#0F1726] border-b border-[#243247] flex justify-between items-center text-xs">
              <span className="font-semibold text-[#E6EDF3]">
                TEMPORALLY CORRELATED LOG ACTIVITY ({correlation.logs.length} RECORDS)
              </span>
              <span className="text-[#8B949E] text-[11px]">
                Window: [{new Date(correlation.start_time * 1000).toLocaleTimeString()} →{' '}
                {new Date(correlation.end_time * 1000).toLocaleTimeString()}]
              </span>
            </div>

            <div className="divide-y divide-[#1A2536] max-h-96 overflow-y-auto">
              {correlation.logs.length === 0 ? (
                <div className="p-6 text-center text-[#8B949E]">
                  No log records found within the ±{correlation.window_seconds}s time window of this metric event.
                </div>
              ) : (
                correlation.logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => onSelectLog(log)}
                    className="p-2.5 hover:bg-[#111B29] cursor-pointer flex items-start gap-3 transition-colors group"
                  >
                    <span className="text-[11px] text-[#8B949E] whitespace-nowrap pt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold border rounded uppercase whitespace-nowrap ${getLevelColor(
                        log.level
                      )}`}
                    >
                      {log.level}
                    </span>
                    <span className="text-[#58A6FF] font-medium text-[11px] whitespace-nowrap pt-0.5">
                      [{log.service}]
                    </span>
                    <span className="text-[#C9D1D9] text-[11px] flex-1 break-words group-hover:text-[#E6EDF3]">
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
