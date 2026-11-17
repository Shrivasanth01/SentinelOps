import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import {
  AnomalyEvent,
  AnomalyTimelineResponse,
  TimelineBucket,
} from '../../types/ml';

interface AnomalyTimelineProps {
  timeline: AnomalyTimelineResponse | null;
  anomalies: AnomalyEvent[];
  onSelectAnomaly: (anomaly: AnomalyEvent) => void;
  onQuickAcknowledge: (id: string) => void;
}

export const AnomalyTimeline: React.FC<AnomalyTimelineProps> = ({
  timeline,
  anomalies,
  onSelectAnomaly,
  onQuickAcknowledge,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterUnackedOnly, setFilterUnackedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const buckets: TimelineBucket[] = timeline?.buckets ?? [];

  // Find max bucket count for histogram scaling
  const maxBucketCount = Math.max(1, ...buckets.map(b => b.total_count));

  // Filter anomalies
  const filteredAnomalies = anomalies.filter(a => {
    if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
    if (filterUnackedOnly && a.acknowledged) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchExpl = a.explanation?.toLowerCase().includes(q);
      const matchMetrics = a.contributing_metrics?.some(m => m.toLowerCase().includes(q));
      const matchHost = a.host_id?.toLowerCase().includes(q);
      if (!matchExpl && !matchMetrics && !matchHost) return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-obs-critical/20 text-obs-critical border-obs-critical/40';
      case 'HIGH':
        return 'bg-obs-critical/15 text-obs-critical border-obs-critical/30';
      case 'MEDIUM':
        return 'bg-obs-warning/15 text-obs-warning border-obs-warning/30';
      case 'LOW':
        return 'bg-obs-healthy/10 text-obs-healthy border-obs-healthy/30';
      default:
        return 'bg-obs-border/30 text-obs-text-muted border-obs-border/50';
    }
  };

  return (
    <div className="space-y-4">
      {/* 24-Hour Spikes Histogram Chart */}
      <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between border-b border-obs-border/60 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-obs-accent" />
            <h3 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider">
              Chronological Anomaly Distribution (Last 24 Hours)
            </h3>
          </div>
          <span className="text-[10px] text-obs-text-muted">
            Total Detections: <span className="text-obs-accent font-semibold">{timeline?.total_events ?? 0}</span>
          </span>
        </div>

        {/* Histogram bars */}
        {buckets.length > 0 ? (
          <div className="space-y-2">
            <div className="h-28 flex items-end gap-1 pt-3 pb-1 px-1 bg-obs-bg-secondary/40 rounded border border-obs-border/30 overflow-x-auto">
              {buckets.map((b, idx) => {
                const heightPct = Math.max(4, (b.total_count / maxBucketCount) * 100);
                const hasCritical = b.critical_count > 0;
                const hasHigh = b.high_count > 0;
                const hasAnom = b.anomalous_count > 0;

                const barColor = hasCritical
                  ? 'bg-obs-critical hover:bg-obs-critical/80'
                  : hasHigh
                  ? 'bg-obs-warning hover:bg-obs-warning/80'
                  : hasAnom
                  ? 'bg-obs-accent hover:bg-obs-accent/80'
                  : 'bg-obs-border/40 hover:bg-obs-border/80';

                return (
                  <div
                    key={idx}
                    className="flex-1 min-w-[10px] flex flex-col items-center justify-end group relative h-full"
                  >
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                      <div className="px-2 py-1 rounded bg-obs-panel border border-obs-border shadow-xl text-[9px] text-obs-text-primary whitespace-nowrap">
                        <div className="font-semibold text-obs-accent">{b.time_label}</div>
                        <div>Total: {b.total_count}</div>
                        {b.anomalous_count > 0 && (
                          <div className="text-obs-warning">Anomalies: {b.anomalous_count}</div>
                        )}
                        {b.critical_count > 0 && (
                          <div className="text-obs-critical">Critical: {b.critical_count}</div>
                        )}
                      </div>
                    </div>

                    <div
                      className={`w-full rounded-t transition-all ${barColor}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between text-[9px] text-obs-text-muted px-1">
              <span>{buckets[0]?.time_label ?? '-24h'}</span>
              <span>Histogram bucket size: 5 minutes</span>
              <span>{buckets[buckets.length - 1]?.time_label ?? 'Now'}</span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-obs-text-muted">
            No historical timeline telemetry collected in this observation window.
          </div>
        )}
      </div>

      {/* Events Table & Filter Controls */}
      <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-obs-border/60 pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-obs-accent" />
            <h3 className="text-xs font-semibold text-obs-text-primary uppercase tracking-wider">
              Anomaly Incident Log ({filteredAnomalies.length})
            </h3>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-obs-text-muted absolute left-2 top-2" />
              <input
                type="text"
                placeholder="Filter drivers or notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-7 pr-2.5 py-1 text-xs rounded border border-obs-border bg-obs-bg-secondary text-obs-text-primary focus:outline-none focus:border-obs-accent w-44"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-obs-border bg-obs-bg-secondary text-obs-text-primary focus:outline-none focus:border-obs-accent"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Unacked toggle */}
            <button
              onClick={() => setFilterUnackedOnly(!filterUnackedOnly)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                filterUnackedOnly
                  ? 'border-obs-warning/50 bg-obs-warning/15 text-obs-warning font-semibold'
                  : 'border-obs-border bg-obs-bg-secondary text-obs-text-secondary hover:text-obs-text-primary'
              }`}
            >
              Unacked Only
            </button>
          </div>
        </div>

        {/* Anomalies Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-obs-border/60 text-[10px] uppercase text-obs-text-muted tracking-wider">
                <th className="py-2 px-2.5">Timestamp</th>
                <th className="py-2 px-2.5">Severity</th>
                <th className="py-2 px-2.5">Risk Score</th>
                <th className="py-2 px-2.5">Host</th>
                <th className="py-2 px-2.5">Key Drivers</th>
                <th className="py-2 px-2.5">Status</th>
                <th className="py-2 px-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obs-border/30">
              {filteredAnomalies.length > 0 ? (
                filteredAnomalies.map(anom => (
                  <tr
                    key={anom.id}
                    className="hover:bg-obs-surface/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectAnomaly(anom)}
                  >
                    <td className="py-2.5 px-2.5 font-mono text-[11px] text-obs-text-primary whitespace-nowrap">
                      {new Date(anom.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(anom.severity)}`}>
                        {anom.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 font-mono text-xs font-semibold whitespace-nowrap text-obs-accent">
                      {(anom.score * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2.5 text-obs-text-secondary whitespace-nowrap text-[11px]">
                      {anom.host_id}
                    </td>
                    <td className="py-2.5 px-2.5 text-obs-text-secondary max-w-xs truncate">
                      {anom.contributing_metrics && anom.contributing_metrics.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {anom.contributing_metrics.slice(0, 2).map((m, i) => (
                            <span key={i} className="px-1.5 py-0.2 rounded bg-obs-bg-secondary text-[10px] text-obs-warning border border-obs-border">
                              {m}
                            </span>
                          ))}
                          {anom.contributing_metrics.length > 2 && (
                            <span className="text-[10px] text-obs-text-muted">+{anom.contributing_metrics.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-obs-text-muted text-[10px]">Multivariate distance</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {anom.acknowledged ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-obs-healthy">
                          <CheckCircle2 className="w-3 h-3" /> Acked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-obs-warning font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {!anom.acknowledged && (
                          <button
                            onClick={() => onQuickAcknowledge(anom.id)}
                            className="px-2 py-1 text-[10px] rounded border border-obs-healthy/40 bg-obs-healthy/10 hover:bg-obs-healthy/20 text-obs-healthy font-medium transition-colors"
                          >
                            Ack
                          </button>
                        )}
                        <button
                          onClick={() => onSelectAnomaly(anom)}
                          className="px-2 py-1 text-[10px] rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-accent flex items-center gap-1 transition-colors"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-obs-text-muted">
                    No anomaly records match the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
