import React from 'react';
import {
  Activity,
  Server,
  Cpu,
  Terminal,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Settings,
  Shield,
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
  phase?: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Activity, phase: 'Active' },
  { id: 'infrastructure', label: 'Infrastructure', icon: Server, phase: 'Live' },
  { id: 'monitoring', label: 'Monitoring', icon: Cpu, phase: 'Live' },
  { id: 'logs', label: 'Logs', icon: Terminal, phase: 'Phase 3' },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle, phase: 'Phase 3' },
  { id: 'incidents', label: 'Incidents', icon: ShieldAlert, phase: 'Phase 4' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles, phase: 'Phase 4' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  backendConnected,
  databaseConnected,
}) => {
  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-navy-800 bg-navy-900/95 backdrop-blur-md min-h-screen">
      {/* Top Branding Header */}
      <div>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-navy-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white text-lg">SentinelOps</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">
                v0.1
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-tight">
              Always watching. Always aware.
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Platform Operations
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.phase && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      item.phase === 'Active' || item.phase === 'Live'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-navy-800 text-slate-400'
                    }`}
                  >
                    {item.phase}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Node Diagnostics Summary */}
      <div className="p-4 border-t border-navy-800 bg-navy-950/60 m-3 rounded-xl">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            Core Cluster
          </span>
          <span className="text-[11px] text-slate-400">Phase 1</span>
        </div>

        <div className="space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">FastAPI:</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className={backendConnected ? 'text-emerald-400' : 'text-rose-400'}>
                {backendConnected ? 'ALIVE' : 'OFFLINE'}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">PostgreSQL:</span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  databaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className={databaseConnected ? 'text-emerald-400' : 'text-rose-400'}>
                {databaseConnected ? 'READY' : 'OFFLINE'}
              </span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

