import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

export interface IncidentItem {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  service: string;
  timestamp: string;
  status: 'INVESTIGATING' | 'IDENTIFIED' | 'MITIGATED' | 'RESOLVED';
  summary: string;
}

const DEFAULT_INCIDENTS: IncidentItem[] = [
  {
    id: 'INC-2041',
    title: 'PostgreSQL Connection Exhaustion Warning',
    severity: 'HIGH',
    service: 'sentinelops_db',
    timestamp: '10 mins ago',
    status: 'IDENTIFIED',
    summary: 'Active connections peaked at 18/20 pool threshold during telemetry flush tick.',
  },
  {
    id: 'INC-2040',
    title: 'Network Inbound Packet Spike (+18.4 MB/s)',
    severity: 'MEDIUM',
    service: 'edge-gateway-01',
    timestamp: '28 mins ago',
    status: 'MITIGATED',
    summary: 'Brief ingress saturation on eth0; traffic rate normalized back to 2.1 MB/s.',
  },
  {
    id: 'INC-2039',
    title: 'Isolation Forest Anomaly Deviation on CPU Load',
    severity: 'LOW',
    service: 'sentinel-api-core',
    timestamp: '1 hour ago',
    status: 'RESOLVED',
    summary: 'Statistical z-score reached 2.4 sigma on worker core 3 during test run.',
  },
];

export const IncidentTimeline: React.FC<{ incidents?: IncidentItem[] }> = ({
  incidents = DEFAULT_INCIDENTS,
}) => {
  const getSeverityStyle = (severity: IncidentItem['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-obs-critical/20 text-obs-critical border-obs-critical/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'LOW':
        return 'bg-obs-healthy/10 text-obs-healthy border-obs-healthy/30';
    }
  };

  const getStatusStyle = (status: IncidentItem['status']) => {
    switch (status) {
      case 'INVESTIGATING':
        return 'text-rose-400';
      case 'IDENTIFIED':
        return 'text-amber-400';
      case 'MITIGATED':
        return 'text-cyan-400';
      case 'RESOLVED':
        return 'text-obs-healthy';
    }
  };

  return (
    <div className="rounded-2xl border border-obs-border bg-obs-panel shadow-panel p-5 font-mono text-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-obs-border">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-obs-critical" />
          <span className="font-bold text-obs-text-primary uppercase tracking-wider">
            Incident Signal Timeline
          </span>
        </div>
        <span className="text-[11px] text-obs-text-secondary">
          {incidents.length} Recorded Signals
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-obs-border">
        {incidents.map((inc) => (
          <div key={inc.id} className="relative group">
            {/* Timeline Pin Dot */}
            <div
              className={`absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-obs-panel ${
                inc.status === 'RESOLVED'
                  ? 'bg-obs-healthy'
                  : inc.severity === 'CRITICAL'
                  ? 'bg-obs-critical'
                  : 'bg-amber-400'
              }`}
            />

            <div className="rounded-xl border border-obs-border-subtle bg-obs-bg-secondary p-3.5 hover:border-obs-accent/40 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-obs-text-primary">{inc.id}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getSeverityStyle(
                      inc.severity
                    )}`}
                  >
                    {inc.severity}
                  </span>
                  <span className="text-obs-text-secondary">&bull;</span>
                  <span className="text-obs-accent font-semibold">{inc.service}</span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-obs-text-muted">
                  <span className={`font-semibold ${getStatusStyle(inc.status)}`}>
                    {inc.status}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {inc.timestamp}
                  </span>
                </div>
              </div>

              <div className="font-semibold text-obs-text-primary text-xs mb-1">
                {inc.title}
              </div>
              <p className="text-[11px] text-obs-text-secondary leading-relaxed">
                {inc.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
