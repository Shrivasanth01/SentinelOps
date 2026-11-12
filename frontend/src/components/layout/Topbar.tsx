import React, { useState } from 'react';
import {
  Search,
  Bell,
  RefreshCw,
  Code2,
  Clock,
  User,
  Radio,
  X,
} from 'lucide-react';
import { TelemetryHeaders } from '../../types/health';
import { EnvironmentSwitcher, Environment } from '../observatory/EnvironmentSwitcher';
import { SystemHealthIndicator } from '../observatory/SystemHealthIndicator';

interface TopbarProps {
  currentSection: string;
  environment?: string;
  backendConnected: boolean;
  databaseConnected: boolean;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  telemetry: TelemetryHeaders;
  onOpenDiagnostics: () => void;
  onOpenCommandPalette: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentSection,
  environment = 'development',
  backendConnected,
  databaseConnected,
  lastUpdated,
  isRefreshing,
  onRefresh,
  telemetry,
  onOpenDiagnostics,
  onOpenCommandPalette,
}) => {
  const [currentEnv, setCurrentEnv] = useState<Environment>(
    environment.toLowerCase().includes('prod')
      ? 'PRODUCTION'
      : environment.toLowerCase().includes('stag')
      ? 'STAGING'
      : 'DEVELOPMENT'
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Notifications for the notifications drawer
  const notifications = [
    {
      id: '1',
      title: 'Multivariate ML Model Warm',
      time: '2m ago',
      msg: 'Isolation Forest telemetry model calibrated on 240 metric frames.',
    },
    {
      id: '2',
      title: 'PostgreSQL Pool Synchronized',
      time: '12m ago',
      msg: 'SQLAlchemy connection pool verified healthy.',
    },
  ];

  return (
    <header className="h-14 border-b border-obs-border bg-obs-bg/95 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30 font-mono select-none">
      {/* Left Section: SentinelOps Identity & Env Switcher */}
      <div className="flex items-center gap-4">
        {/* Brand Aperture & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded border border-obs-accent/40 bg-obs-accent/10 flex items-center justify-center text-obs-accent shadow-sm shadow-obs-accent/20">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-obs-text-primary text-sm font-sans">
                SENTINEL<span className="text-obs-accent">OPS</span>
              </span>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-obs-surface border border-obs-border text-obs-accent">
                OBSERVATORY v1.5
              </span>
            </div>
            <div className="text-[10px] text-obs-text-muted hidden lg:block tracking-tight">
              Observe &bull; Detect &bull; Investigate &bull; Resolve
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-obs-border hidden md:block" />

        {/* Environment Switcher */}
        <EnvironmentSwitcher currentEnv={currentEnv} onEnvChange={setCurrentEnv} />

        {/* Section Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-obs-surface/80 border border-obs-border text-xs text-obs-text-secondary">
          <span className="text-obs-text-muted">SCOPE:</span>
          <span className="text-obs-accent font-semibold uppercase">{currentSection.replace('-', ' ')}</span>
        </div>
      </div>

      {/* Middle Section: Global Search / Command Launcher Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded border border-obs-border bg-obs-panel/80 hover:bg-obs-surface hover:border-obs-accent/50 text-xs text-obs-text-muted transition-all group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-obs-text-muted group-hover:text-obs-accent transition-colors" />
            <span className="font-mono text-obs-text-secondary group-hover:text-obs-text-primary">
              Search telemetry, nodes, commands...
            </span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-obs-bg border border-obs-border text-obs-text-muted">
              Ctrl
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-obs-bg border border-obs-border text-obs-text-muted">
              K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right Section: System Connectivity, Telemetry, Notifications & User */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="md:hidden p-1.5 rounded border border-obs-border bg-obs-panel text-obs-text-secondary hover:text-obs-text-primary"
          title="Open Command Launcher"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {/* System Health Connectivity Chip */}
        <SystemHealthIndicator
          backendConnected={backendConnected}
          databaseConnected={databaseConnected}
          responseTimeMs={telemetry.responseTimeMs}
          compact={true}
        />

        {/* Correlation ID diagnostic button */}
        {telemetry.correlationId && (
          <button
            onClick={onOpenDiagnostics}
            title="Correlation ID Diagnostics"
            className="hidden lg:flex items-center gap-1 px-2 py-1 rounded bg-obs-panel border border-obs-border hover:border-obs-accent/40 text-[11px] text-obs-text-muted hover:text-obs-text-primary transition-colors"
          >
            <Code2 className="w-3 h-3 text-obs-accent" />
            <span className="text-obs-text-muted">CID:</span>
            <span className="text-obs-accent">{telemetry.correlationId.slice(0, 6)}</span>
          </button>
        )}

        {/* Last Sync Indicator */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-obs-text-muted">
          <Clock className="w-3 h-3 text-obs-accent" />
          <span>{lastUpdated ? lastUpdated.toLocaleTimeString() : '--:--:--'}</span>
        </div>

        {/* Refresh Probe Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Trigger Synchronous Connectivity Probe"
          className="p-1.5 rounded border border-obs-border bg-obs-panel hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-obs-accent' : ''}`} />
        </button>

        {/* Notifications Trigger */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-1.5 rounded border border-obs-border bg-obs-panel hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary relative transition-colors"
            title="System Signal Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-obs-accent animate-pulse" />
          </button>

          {/* Notifications Dropdown Modal */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-obs-border bg-obs-panel shadow-2xl p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-obs-border">
                <span className="font-semibold text-obs-text-primary uppercase tracking-wider text-[11px]">
                  System Signal Stream
                </span>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-obs-text-muted hover:text-obs-text-primary"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 rounded bg-obs-bg border border-obs-border/60">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-semibold text-obs-accent">{n.title}</span>
                      <span className="text-obs-text-muted">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-obs-text-secondary font-sans leading-tight">
                      {n.msg}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile / Operator Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-obs-border">
          <div className="w-7 h-7 rounded border border-obs-border bg-obs-surface flex items-center justify-center text-obs-accent">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-[11px] font-semibold text-obs-text-primary leading-none">
              OP-SRE-01
            </div>
            <div className="text-[9px] text-obs-text-muted leading-tight">
              ROOT &bull; US-EAST
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
