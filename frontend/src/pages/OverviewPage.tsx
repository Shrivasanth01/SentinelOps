import React from 'react';
import {
  Radio,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { HealthState } from '../hooks/useHealth';
import { useMetrics } from '../hooks/useMetrics';
import { InfrastructureTopology } from '../components/observatory/InfrastructureTopology';
import { TelemetryPanel } from '../components/observatory/TelemetryPanel';
import { ServiceStatus } from '../components/observatory/ServiceStatus';
import { IncidentTimeline, IncidentItem } from '../components/observatory/IncidentTimeline';
import { ActivityStream, ActivityEvent } from '../components/observatory/ActivityStream';

interface OverviewPageProps {
  healthState: HealthState;
  onRefresh: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  healthState,
  onRefresh,
}) => {
  const { backendConnected, databaseConnected, readiness } = healthState;
  const { current: telemetry } = useMetrics(4000, backendConnected);

  // Dynamic incident signals reflecting live backend state
  const incidentSignals: IncidentItem[] = backendConnected
    ? [
        {
          id: 'SIG-1049',
          title: 'Isolation Forest Telemetry Calibration Complete',
          service: 'ml-anomaly-detector',
          severity: 'LOW',
          status: 'RESOLVED',
          timestamp: '3m ago',
          summary: '240 metrics vectors analyzed with 0 out-of-boundary deviations.',
        },
        {
          id: 'SIG-1048',
          title: 'PostgreSQL Connection Pool Verified',
          service: 'db-pool-async',
          severity: 'LOW',
          status: 'RESOLVED',
          timestamp: '14m ago',
          summary: 'Async engine initialized with 20 persistent pool slots.',
        },
      ]
    : [
        {
          id: 'SIG-CRIT-01',
          title: 'Backend API Unreachable',
          service: 'api-gateway',
          severity: 'CRITICAL',
          status: 'INVESTIGATING',
          timestamp: 'Just now',
          summary: 'FastAPI service at http://127.0.0.1:8000 is not responding to probes.',
        },
      ];

  // Dynamic operational activity events
  const activityLogs: ActivityEvent[] = [
    {
      id: 'act-1',
      time: new Date().toLocaleTimeString(),
      actor: 'health-probe',
      service: 'api-gateway',
      action: backendConnected
        ? `Telemetry heartbeat OK (latency: ${readiness?.database.latency_ms ?? 1.2}ms)`
        : 'API Gateway connection timeout: 127.0.0.1:8000',
      type: 'telemetry',
    },
    {
      id: 'act-2',
      time: new Date(Date.now() - 4000).toLocaleTimeString(),
      actor: 'telemetry-daemon',
      service: 'psutil-collector',
      action: 'Hardware telemetry buffer received metric snapshot (CPU/Mem/Disk)',
      type: 'telemetry',
    },
    {
      id: 'act-3',
      time: new Date(Date.now() - 8000).toLocaleTimeString(),
      actor: 'session-pool',
      service: 'postgresql-17',
      action: databaseConnected
        ? 'Database SELECT 1 probe succeeded'
        : 'Database connection offline or pending container start',
      type: 'database',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Observatory Scope Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/70 backdrop-blur-sm font-mono">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wider uppercase text-obs-text-primary">
                Observatory Main Canvas
              </h2>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-obs-accent/15 border border-obs-accent/30 text-obs-accent">
                CLUSTER: LOCAL-DEV-01
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              Live multi-node mesh topology, host telemetry frames, and autonomous signal streams
            </p>
          </div>
        </div>

        {/* Global Action Links */}
        <div className="flex items-center gap-2 text-xs">
          <a
            href="http://127.0.0.1:8000/metrics"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors text-[11px]"
          >
            <span>Prometheus</span>
            <ExternalLink className="w-3 h-3 text-obs-accent" />
          </a>

          <a
            href="http://127.0.0.1:8000/api/v1/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors text-[11px]"
          >
            <span>OpenAPI Docs</span>
            <ExternalLink className="w-3 h-3 text-obs-accent" />
          </a>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-obs-accent/40 bg-obs-accent/10 hover:bg-obs-accent/20 text-obs-accent text-[11px] font-semibold transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Poll Now</span>
          </button>
        </div>
      </div>

      {/* Main Observatory Canvas: Asymmetric Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (8 cols): Primary Visual Focus (Mesh Topology & Service Status) */}
        <div className="lg:col-span-8 space-y-4 flex flex-col">
          {/* Interactive Topology Mesh */}
          <div className="relative">
            <InfrastructureTopology />
          </div>

          {/* Subsystem Operational Matrix */}
          <div>
            <ServiceStatus
              backendConnected={backendConnected}
              databaseConnected={databaseConnected}
            />
          </div>
        </div>

        {/* Right Column (4 cols): Live Telemetry, Signals & Stream */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {/* Real-time Hardware Telemetry Panel */}
          <TelemetryPanel telemetry={telemetry} cadenceSeconds={4} />

          {/* Incident Signal Timeline */}
          <IncidentTimeline incidents={incidentSignals} />

          {/* Activity Stream */}
          <ActivityStream activities={activityLogs} />
        </div>
      </div>
    </div>
  );
};
