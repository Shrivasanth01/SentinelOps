import React from 'react';
import { Layers, Activity, Database, Radio, Brain, Shield } from 'lucide-react';

interface ServiceStatusProps {
  backendConnected: boolean;
  databaseConnected: boolean;
}

export const ServiceStatus: React.FC<ServiceStatusProps> = ({
  backendConnected,
  databaseConnected,
}) => {
  const services = [
    {
      name: 'SentinelOps API Gateway',
      category: 'Core Service',
      protocol: 'HTTP/1.1 REST',
      port: 8000,
      status: backendConnected ? 'ONLINE' : 'OFFLINE',
      healthy: backendConnected,
      icon: Activity,
    },
    {
      name: 'PostgreSQL 17 Storage Engine',
      category: 'Persistence',
      protocol: 'TCP / Psycopg3',
      port: 5432,
      status: databaseConnected ? 'ONLINE' : 'DEGRADED',
      healthy: databaseConnected,
      icon: Database,
    },
    {
      name: 'Telemetry Ingestion Daemon',
      category: 'Kernel Observer',
      protocol: 'Asynchronous Loop',
      port: 8000,
      status: backendConnected ? 'ACTIVE' : 'STANDBY',
      healthy: backendConnected,
      icon: Radio,
    },
    {
      name: 'Isolation Forest Anomaly Engine',
      category: 'Machine Learning',
      protocol: 'Scikit-Learn Model',
      port: 8000,
      status: backendConnected ? 'FITTED' : 'STANDBY',
      healthy: backendConnected,
      icon: Brain,
    },
    {
      name: 'Prometheus Exporter Target',
      category: 'Observability Scraper',
      protocol: 'Prometheus Text',
      port: 8000,
      status: backendConnected ? 'READY' : 'OFFLINE',
      healthy: backendConnected,
      icon: Layers,
    },
  ];

  return (
    <div className="rounded-2xl border border-obs-border bg-obs-panel shadow-panel p-5 font-mono text-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-obs-border">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-obs-accent" />
          <span className="font-bold text-obs-text-primary uppercase tracking-wider">
            Subsystem Status Matrix
          </span>
        </div>
        <span className="text-[11px] text-obs-text-secondary">
          {services.filter((s) => s.healthy).length} / {services.length} Operational
        </span>
      </div>

      <div className="divide-y divide-obs-border-subtle">
        {services.map((svc, idx) => {
          const Icon = svc.icon;
          return (
            <div
              key={idx}
              className="py-2.5 flex items-center justify-between hover:bg-obs-bg-secondary/60 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-lg border ${
                    svc.healthy
                      ? 'bg-obs-healthy/10 border-obs-healthy/20 text-obs-healthy'
                      : 'bg-obs-critical/10 border-obs-critical/20 text-obs-critical'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-obs-text-primary">{svc.name}</div>
                  <div className="text-[11px] text-obs-text-secondary">
                    {svc.category} &bull; {svc.protocol} &bull; :{svc.port}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    svc.healthy
                      ? 'bg-obs-healthy/10 text-obs-healthy border-obs-healthy/30'
                      : 'bg-obs-critical/10 text-obs-critical border-obs-critical/30'
                  }`}
                >
                  {svc.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
