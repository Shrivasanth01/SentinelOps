import React, { useState } from 'react';
import {
  Activity,
  Server,
  Cpu,
  Terminal,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

export type NavSection =
  | 'overview'
  | 'infrastructure'
  | 'monitoring'
  | 'logs'
  | 'anomalies'
  | 'incidents'
  | 'ai-assistant'
  | 'settings';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  backendConnected: boolean;
  databaseConnected: boolean;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tag?: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Command Canvas', icon: Activity, tag: 'LIVE' },
  { id: 'infrastructure', label: 'Topology Mesh', icon: Server, tag: 'MESH' },
  { id: 'monitoring', label: 'Telemetry Stream', icon: Cpu, tag: 'STREAM' },
  { id: 'logs', label: 'Log Terminal', icon: Terminal, tag: 'AUDIT' },
  { id: 'anomalies', label: 'ML Anomaly Radar', icon: AlertTriangle, tag: 'RADAR' },
  { id: 'incidents', label: 'Incident Workspace', icon: ShieldAlert, tag: 'TRIAGE' },
  { id: 'ai-assistant', label: 'AIOps Investigator', icon: Sparkles, tag: 'AI' },
  { id: 'settings', label: 'Gateway Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  backendConnected,
  databaseConnected,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <aside
      aria-label="Observatory Navigation Rail"
      className={`flex-shrink-0 flex flex-col justify-between border-r border-obs-border bg-obs-bg-secondary/95 backdrop-blur-md transition-all duration-300 z-20 ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Top Section */}
      <div>
        {/* Toggle Collapse Bar */}
        <div className="h-10 flex items-center justify-between px-3 border-b border-obs-border/60 bg-obs-bg/60">
          {isExpanded ? (
            <span className="text-[10px] font-mono uppercase tracking-wider text-obs-text-muted">
              Observatory Rail
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-obs-accent mx-auto" />
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse Navigation Rail' : 'Expand Navigation Rail'}
            className="p-1 rounded text-obs-text-muted hover:text-obs-text-primary hover:bg-obs-surface transition-colors"
            title={isExpanded ? 'Collapse Rail' : 'Expand Rail'}
          >
            {isExpanded ? (
              <ChevronLeft className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Navigation Rail Links */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md font-mono text-xs transition-all duration-150 relative group ${
                  isActive
                    ? 'bg-obs-accent/15 text-obs-accent border border-obs-accent/40 shadow-sm shadow-obs-accent/10 font-semibold'
                    : 'text-obs-text-secondary hover:text-obs-text-primary hover:bg-obs-surface/60 border border-transparent'
                }`}
              >
                {/* Active Indicator Bar on Left */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r bg-obs-accent" />
                )}

                <div className="shrink-0 flex items-center justify-center">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-obs-accent' : 'text-obs-text-muted group-hover:text-obs-text-primary'
                    }`}
                  />
                </div>

                {isExpanded && (
                  <div className="flex-1 flex items-center justify-between overflow-hidden">
                    <span className="truncate tracking-wide">{item.label}</span>
                    {item.tag && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          isActive
                            ? 'bg-obs-accent/20 text-obs-accent'
                            : 'bg-obs-surface text-obs-text-muted border border-obs-border/60'
                        }`}
                      >
                        {item.tag}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Compact Telemetry Status */}
      <div className="p-2 border-t border-obs-border/70 bg-obs-bg/60">
        {isExpanded ? (
          <div className="p-2 rounded border border-obs-border/70 bg-obs-panel/60 font-mono text-[10px] space-y-1.5">
            <div className="flex items-center justify-between text-obs-text-muted">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-obs-accent" />
                <span>DAEMON</span>
              </span>
              <span className="text-obs-accent">v1.5</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-obs-text-muted">API GATEWAY:</span>
              <span className="flex items-center gap-1 font-semibold">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    backendConnected ? 'bg-obs-healthy animate-pulse' : 'bg-obs-critical'
                  }`}
                />
                <span className={backendConnected ? 'text-obs-healthy' : 'text-obs-critical'}>
                  {backendConnected ? 'ONLINE' : 'DOWN'}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-obs-text-muted">PERSISTENCE:</span>
              <span className="flex items-center gap-1 font-semibold">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    databaseConnected ? 'bg-obs-healthy animate-pulse' : 'bg-obs-critical'
                  }`}
                />
                <span className={databaseConnected ? 'text-obs-healthy' : 'text-obs-critical'}>
                  {databaseConnected ? 'ONLINE' : 'DOWN'}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              title={`API Gateway: ${backendConnected ? 'ONLINE' : 'OFFLINE'}`}
              className={`w-2 h-2 rounded-full ${
                backendConnected ? 'bg-obs-healthy animate-pulse' : 'bg-obs-critical'
              }`}
            />
            <div
              title={`Database: ${databaseConnected ? 'ONLINE' : 'OFFLINE'}`}
              className={`w-2 h-2 rounded-full ${
                databaseConnected ? 'bg-obs-healthy animate-pulse' : 'bg-obs-critical'
              }`}
            />
          </div>
        )}
      </div>
    </aside>
  );
};
