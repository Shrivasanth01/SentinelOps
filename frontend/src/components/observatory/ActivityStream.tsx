import React from 'react';
import { Terminal } from 'lucide-react';

export interface ActivityEvent {
  id: string;
  time: string;
  actor: string;
  service: string;
  action: string;
  type: 'telemetry' | 'security' | 'ml' | 'database' | 'system';
}

const DEFAULT_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'act-1',
    time: '18:24:02',
    actor: 'telemetry-daemon',
    service: 'psutil-collector',
    action: 'Flushed 5s host metrics snapshot to in-memory circular ring buffer.',
    type: 'telemetry',
  },
  {
    id: 'act-2',
    time: '18:23:45',
    actor: 'isolation-forest',
    service: 'ml-engine',
    action: 'Computed multi-variate anomaly score (0.24 - Nominal, 6 features).',
    type: 'ml',
  },
  {
    id: 'act-3',
    time: '18:22:18',
    actor: 'session-pool',
    service: 'postgresql-17',
    action: 'Executed readiness SELECT 1 health probe in 1.48ms.',
    type: 'database',
  },
  {
    id: 'act-4',
    time: '18:20:10',
    actor: 'api-router',
    service: 'fastapi-gateway',
    action: 'Dispatched Prometheus scrape request from /metrics endpoint.',
    type: 'system',
  },
  {
    id: 'act-5',
    time: '18:18:40',
    actor: 'operator-root',
    service: 'command-palette',
    action: 'Triggered diagnostic anomaly scan across cluster nodes.',
    type: 'security',
  },
];

export const ActivityStream: React.FC<{ activities?: ActivityEvent[] }> = ({
  activities = DEFAULT_ACTIVITIES,
}) => {
  const getTypeColor = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'telemetry':
        return 'text-obs-accent';
      case 'ml':
        return 'text-amber-400';
      case 'database':
        return 'text-indigo-400';
      case 'security':
        return 'text-obs-critical';
      default:
        return 'text-obs-healthy';
    }
  };

  return (
    <div className="rounded-2xl border border-obs-border bg-obs-panel shadow-panel p-5 font-mono text-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-obs-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-obs-accent" />
          <span className="font-bold text-obs-text-primary uppercase tracking-wider">
            Operational Activity Stream
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-obs-text-secondary">
          <span className="h-2 w-2 rounded-full bg-obs-healthy animate-pulse" />
          <span>Live Feed</span>
        </div>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {activities.map((act) => (
          <div
            key={act.id}
            className="flex items-start gap-3 p-2 rounded-lg bg-obs-bg-secondary/60 border border-obs-border-subtle hover:border-obs-border transition-colors text-[11px]"
          >
            <span className="text-obs-text-muted whitespace-nowrap mt-0.5">{act.time}</span>
            <span className={`font-semibold whitespace-nowrap ${getTypeColor(act.type)}`}>
              [{act.service}]
            </span>
            <span className="text-obs-text-secondary flex-1 leading-relaxed">
              <b className="text-obs-text-primary">{act.actor}</b> &mdash; {act.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
