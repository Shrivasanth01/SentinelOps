import React from 'react';
import {
  Terminal,
  Activity,
  Search,
  AlertOctagon,
  GitCompare,
  Server,
  RefreshCw,
  Database,
} from 'lucide-react';
import { useLogIntelligence } from '../hooks/useLogIntelligence';
import { LogStream } from '../components/observatory/LogStream';
import { LogExplorer } from '../components/observatory/LogExplorer';
import { LogDetailsDrawer } from '../components/observatory/LogDetailsDrawer';
import { ErrorIntelligence } from '../components/observatory/ErrorIntelligence';
import { LogTimelineChart } from '../components/observatory/LogTimelineChart';
import { LogSourceManager } from '../components/observatory/LogSourceManager';
import { MetricLogCorrelator } from '../components/observatory/MetricLogCorrelator';

interface LogsPageProps {
  backendConnected?: boolean;
}

export const LogsPage: React.FC<LogsPageProps> = () => {
  const {
    activeTab,
    setActiveTab,
    logs,
    totalCount,
    isLoading,
    isStreaming,
    setIsStreaming,
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
    selectedLog,
    setSelectedLog,
    summary,
    errorIntelligence,
    timeline,
    correlation,
    correlateLoading,
    runCorrelation,
    sources,
    sourcesLoading,
    refreshSources,
    createSource,
    deleteSource,
    refresh,
  } = useLogIntelligence();

  const handleFilterPattern = (pattern: string) => {
    // Extract significant keyword from error sample to search
    const cleanTerm = pattern.split(' ')[0] || pattern;
    setSearchQuery(cleanTerm);
    setActiveTab('explorer');
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Command Observatory Header Banner */}
      <div className="p-4 bg-[#0D1420] border border-[#243247] rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#162235] border border-[#2B3E5C] rounded-md text-[#58A6FF] shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#E6EDF3] tracking-wider uppercase">
                CENTRALIZED LOG INTELLIGENCE & TELEMETRY OBSERVATORY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#36D399]/15 border border-[#36D399]/30 text-[#36D399]">
                PHASE 4 ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-[#8B949E] mt-0.5">
              Observe. Detect. Investigate. Resolve. | Unified Grafana Loki, Windows Event Channels & Host Telemetry
            </p>
          </div>
        </div>

        {/* Status Indicators Pill Group */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {/* Loki Connectivity Status */}
          <div className="px-3 py-1 bg-[#101928] border border-[#212E42] rounded flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-[#58A6FF]" />
            <span className="text-[#8B949E]">Storage:</span>
            <span className={`font-semibold ${lokiConnected ? 'text-[#36D399]' : 'text-amber-400'}`}>
              {lokiConnected ? 'Loki TSDB' : 'Fallback Buffer'}
            </span>
          </div>

          {/* Active Sources */}
          <div className="px-3 py-1 bg-[#101928] border border-[#212E42] rounded flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-[#36D399]" />
            <span className="text-[#8B949E]">Sources:</span>
            <span className="font-semibold text-[#E6EDF3]">{sources.length} Configured</span>
          </div>

          {/* Error Rate */}
          <div className="px-3 py-1 bg-[#101928] border border-[#212E42] rounded flex items-center gap-2">
            <AlertOctagon className="w-3.5 h-3.5 text-[#FF5555]" />
            <span className="text-[#8B949E]">Error Rate:</span>
            <span className="font-semibold text-[#FF5555]">
              {summary?.recent_error_rate ? `${summary.recent_error_rate}%` : '0.0%'}
            </span>
          </div>

          {/* Global Refresh */}
          <button
            onClick={refresh}
            className="p-1.5 bg-[#162235] hover:bg-[#1E2E47] border border-[#26374E] rounded text-[#C9D1D9] transition-colors"
            title="Refresh All Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-[#243247] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`px-3.5 py-1.5 rounded font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'explorer'
              ? 'bg-[#162235] text-[#58A6FF] border border-[#2B3F5D]'
              : 'text-[#8B949E] hover:text-[#C9D1D9]'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>LOG EXPLORER</span>
        </button>

        <button
          onClick={() => setActiveTab('stream')}
          className={`px-3.5 py-1.5 rounded font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'stream'
              ? 'bg-[#162235] text-[#58A6FF] border border-[#2B3F5D]'
              : 'text-[#8B949E] hover:text-[#C9D1D9]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>LIVE STREAM</span>
          {isStreaming && (
            <span className="w-2 h-2 rounded-full bg-[#36D399] animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('errors')}
          className={`px-3.5 py-1.5 rounded font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'errors'
              ? 'bg-[#162235] text-[#58A6FF] border border-[#2B3F5D]'
              : 'text-[#8B949E] hover:text-[#C9D1D9]'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>ERROR INTELLIGENCE</span>
          {errorIntelligence && errorIntelligence.total_errors > 0 && (
            <span className="px-1.5 py-0.2 text-[9px] bg-red-500/20 text-[#FF5555] rounded font-bold">
              {errorIntelligence.total_errors}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('correlator')}
          className={`px-3.5 py-1.5 rounded font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'correlator'
              ? 'bg-[#162235] text-[#58A6FF] border border-[#2B3F5D]'
              : 'text-[#8B949E] hover:text-[#C9D1D9]'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>METRIC CORRELATION</span>
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`px-3.5 py-1.5 rounded font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'sources'
              ? 'bg-[#162235] text-[#58A6FF] border border-[#2B3F5D]'
              : 'text-[#8B949E] hover:text-[#C9D1D9]'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>SOURCE MANAGER</span>
        </button>
      </div>

      {/* Timeline Histogram (Rendered on Explorer & Stream tabs) */}
      {(activeTab === 'explorer' || activeTab === 'stream') && timeline && (
        <LogTimelineChart
          buckets={timeline.buckets}
          totalEvents={timeline.total_events}
          timeRange={timeRange}
        />
      )}

      {/* Main Tab Workspace Render */}
      {activeTab === 'explorer' && (
        <LogExplorer
          logs={logs}
          totalCount={totalCount}
          isLoading={isLoading}
          lokiConnected={lokiConnected}
          executionTimeMs={executionTimeMs}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          levelFilter={levelFilter}
          setLevelFilter={setLevelFilter}
          serviceFilter={serviceFilter}
          setServiceFilter={setServiceFilter}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectLog={setSelectedLog}
          onRefresh={refresh}
        />
      )}

      {activeTab === 'stream' && (
        <LogStream
          logs={logs}
          isStreaming={isStreaming}
          onToggleStreaming={() => setIsStreaming(!isStreaming)}
          onSelectLog={setSelectedLog}
        />
      )}

      {activeTab === 'errors' && (
        <ErrorIntelligence
          data={errorIntelligence}
          isLoading={isLoading}
          onFilterPattern={handleFilterPattern}
        />
      )}

      {activeTab === 'correlator' && (
        <MetricLogCorrelator
          correlation={correlation}
          isLoading={correlateLoading}
          onRunCorrelation={runCorrelation}
          onSelectLog={setSelectedLog}
        />
      )}

      {activeTab === 'sources' && (
        <LogSourceManager
          sources={sources}
          isLoading={sourcesLoading}
          onCreateSource={async (src) => {
            const res = await createSource(src);
            return { ok: res.ok, error: res.error };
          }}
          onDeleteSource={async (id) => {
            const res = await deleteSource(id);
            return { ok: res.ok };
          }}
          onRefresh={refreshSources}
        />
      )}

      {/* Deep Inspection Flyout Drawer */}
      <LogDetailsDrawer
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
};
