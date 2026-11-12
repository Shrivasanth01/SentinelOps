import React, { useState } from 'react';
import {
  ShieldAlert,
  Bell,
  SlidersHorizontal,
  Filter,
} from 'lucide-react';
import { IncidentTimeline, IncidentItem } from '../components/observatory/IncidentTimeline';

export const IncidentsPage: React.FC = () => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  // Realistic incident signals reflecting current platform state
  const incidents: IncidentItem[] = [
    {
      id: 'INC-2026-001',
      title: 'Multivariate Telemetry Calibration Notice',
      service: 'ml-anomaly-detector',
      severity: 'LOW',
      status: 'RESOLVED',
      timestamp: '10m ago',
      summary:
        'Continuous Isolation Forest background model successfully completed calibration on 240 hardware metric snapshots.',
    },
    {
      id: 'INC-2026-000',
      title: 'Cluster Persistence Engine Synchronized',
      service: 'postgresql-primary',
      severity: 'LOW',
      status: 'RESOLVED',
      timestamp: '25m ago',
      summary:
        'SQLAlchemy async connection pool initialized with 20 persistent slots and 0 deadlocks.',
    },
  ];

  const filteredIncidents = incidents.filter((inc) => {
    if (filterSeverity === 'ALL') return true;
    return inc.severity === filterSeverity;
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Top Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-critical/30 bg-obs-critical/10 flex items-center justify-center text-obs-critical shrink-0">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text-primary">
                Incident Triage & Chronological Signals
              </h1>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-obs-accent/15 border border-obs-accent/30 text-obs-accent">
                SIGNAL WORKSPACE
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              Chronological incident timelines, escalation trees, and autonomous correlation signals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded border border-obs-border bg-obs-bg text-obs-text-secondary text-[11px]">
            ACTIVE P1/P2: <span className="text-obs-healthy font-bold">0 ACTIVE</span>
          </div>
          <div className="px-2.5 py-1 rounded border border-obs-border bg-obs-bg text-obs-text-secondary text-[11px]">
            ESCALATION: <span className="text-obs-accent">STANDBY</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 cols): Incident Signals & Timeline */}
        <div className="lg:col-span-8 space-y-3">
          {/* Severity Filter Strip */}
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-obs-border bg-obs-panel/80 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-obs-text-muted" />
              <span className="text-obs-text-muted text-[11px]">SEVERITY FILTER:</span>
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2 py-0.5 rounded border text-[10px] uppercase font-semibold transition-colors ${
                    filterSeverity === sev
                      ? 'border-obs-accent/50 bg-obs-accent/20 text-obs-accent'
                      : 'border-obs-border/70 bg-obs-bg text-obs-text-muted hover:text-obs-text-primary'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-obs-text-muted">
              {filteredIncidents.length} incident signal(s)
            </span>
          </div>

          {/* Interactive Incident Timeline */}
          <IncidentTimeline incidents={filteredIncidents} />
        </div>

        {/* Right Column (4 cols): Alert Channels & Escalation Policies */}
        <div className="lg:col-span-4 space-y-4">
          {/* Dispatch Channels */}
          <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
              <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
                <Bell className="w-3.5 h-3.5 text-obs-accent" />
                Notification Channels
              </span>
              <span className="text-[10px] text-obs-accent">DISPATCH ARMED</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-obs-bg border border-obs-border/60">
                <span className="text-obs-text-secondary">PagerDuty Gateway</span>
                <span className="text-[10px] text-obs-healthy font-semibold">CONFIGURED</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-obs-bg border border-obs-border/60">
                <span className="text-obs-text-secondary">Slack #ops-incidents</span>
                <span className="text-[10px] text-obs-healthy font-semibold">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-obs-bg border border-obs-border/60">
                <span className="text-obs-text-secondary">Webhook Ingress</span>
                <span className="text-[10px] text-obs-accent font-semibold">LISTENING</span>
              </div>
            </div>
          </div>

          {/* Escalation Policy Matrix */}
          <div className="p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
              <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-obs-warning" />
                Escalation Ladder
              </span>
              <span className="text-[10px] text-obs-text-muted">TIER 1 &rarr; 3</span>
            </div>

            <div className="space-y-2 text-xs text-obs-text-secondary">
              <div className="p-2 rounded bg-obs-bg border border-obs-border/60">
                <div className="text-[10px] font-bold text-obs-text-primary uppercase mb-0.5">
                  Tier 1: On-Call Primary (SRE)
                </div>
                <div className="text-[10px] text-obs-text-muted">
                  Triggers at T+0s on critical out-of-boundary deviations.
                </div>
              </div>
              <div className="p-2 rounded bg-obs-bg border border-obs-border/60">
                <div className="text-[10px] font-bold text-obs-text-primary uppercase mb-0.5">
                  Tier 2: Engineering Escalation
                </div>
                <div className="text-[10px] text-obs-text-muted">
                  Auto-escalates at T+10m if unacknowledged.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
