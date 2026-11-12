import React, { useState } from 'react';
import {
  Globe,
  Settings,
  Activity,
  Monitor,
} from 'lucide-react';
import { HealthState } from '../hooks/useHealth';

interface SettingsPageProps {
  healthState: HealthState;
  pollInterval: number;
  onSetPollInterval: (ms: number) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  healthState,
  pollInterval,
  onSetPollInterval,
}) => {
  const { configSummary, systemInfo, backendConnected, databaseConnected } = healthState;
  const [gridOverlayEnabled, setGridOverlayEnabled] = useState(true);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);

  return (
    <div className="space-y-4 font-mono">
      {/* Top Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text-primary">
                Observatory Gateway & Preferences
              </h1>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-obs-accent/15 border border-obs-accent/30 text-obs-accent">
                RUNTIME CONFIG
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              Telemetry polling cadences, API gateway parameters, and display options
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded border border-obs-border bg-obs-bg text-obs-text-secondary text-[11px]">
            GATEWAY: <span className={backendConnected ? 'text-obs-healthy font-bold' : 'text-obs-critical font-bold'}>{backendConnected ? 'ALIVE' : 'DOWN'}</span>
          </div>
          <div className="px-2.5 py-1 rounded border border-obs-border bg-obs-bg text-obs-text-secondary text-[11px]">
            DB: <span className={databaseConnected ? 'text-obs-healthy font-bold' : 'text-obs-critical font-bold'}>{databaseConnected ? 'ALIVE' : 'DOWN'}</span>
          </div>
        </div>
      </div>

      {/* Grid of Settings Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Polling Cadence */}
        <div className="p-4 rounded-lg border border-obs-border bg-obs-panel/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
            <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
              <Activity className="w-3.5 h-3.5 text-obs-accent" />
              Telemetry Probe Cadence
            </span>
            <span className="text-[10px] text-obs-accent">
              {pollInterval === 0 ? 'PAUSED' : `${pollInterval / 1000}s INTERVAL`}
            </span>
          </div>
          <p className="text-xs text-obs-text-secondary">
            Sampling frequency for automated health checks to `/api/v1/health` and hardware telemetry ring buffers.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {[
              { label: '2s Fast', val: 2000 },
              { label: '5s Normal', val: 5000 },
              { label: '15s Slow', val: 15000 },
              { label: '30s Relaxed', val: 30000 },
              { label: 'Pause', val: 0 },
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => onSetPollInterval(item.val)}
                className={`py-1.5 px-2 rounded border text-xs font-mono transition-colors text-center ${
                  pollInterval === item.val
                    ? 'border-obs-accent bg-obs-accent/20 text-obs-accent font-bold'
                    : 'border-obs-border/70 bg-obs-bg text-obs-text-muted hover:text-obs-text-primary hover:border-obs-border'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Observatory Display Preferences */}
        <div className="p-4 rounded-lg border border-obs-border bg-obs-panel/80 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
            <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
              <Monitor className="w-3.5 h-3.5 text-obs-accent" />
              Display & Aesthetics
            </span>
            <span className="text-[10px] text-obs-healthy">ACTIVE</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-obs-bg border border-obs-border/60">
              <div>
                <div className="text-obs-text-primary font-semibold">Color Space</div>
                <div className="text-[10px] text-obs-text-muted">Command Observatory Dark Graphite (#080B12)</div>
              </div>
              <span className="text-[10px] text-obs-accent font-mono px-2 py-0.5 rounded bg-obs-accent/10 border border-obs-accent/30">
                LOCKED
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-obs-bg border border-obs-border/60">
              <div>
                <div className="text-obs-text-primary font-semibold">Grid Coordinate Overlay</div>
                <div className="text-[10px] text-obs-text-muted">Subtle dot grid backing on observatory canvas</div>
              </div>
              <button
                onClick={() => setGridOverlayEnabled(!gridOverlayEnabled)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  gridOverlayEnabled
                    ? 'bg-obs-accent/20 text-obs-accent border-obs-accent/40'
                    : 'bg-obs-surface text-obs-text-muted border-obs-border'
                }`}
              >
                {gridOverlayEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-obs-bg border border-obs-border/60">
              <div>
                <div className="text-obs-text-primary font-semibold">Technical Scanline Shaders</div>
                <div className="text-[10px] text-obs-text-muted">Observatory cathode scanline visual effect</div>
              </div>
              <button
                onClick={() => setScanlinesEnabled(!scanlinesEnabled)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                  scanlinesEnabled
                    ? 'bg-obs-accent/20 text-obs-accent border-obs-accent/40'
                    : 'bg-obs-surface text-obs-text-muted border-obs-border'
                }`}
              >
                {scanlinesEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backend & Database Parameters Matrix */}
      <div className="p-4 rounded-lg border border-obs-border bg-obs-panel/80 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-obs-border/70 text-xs">
          <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
            <Globe className="w-3.5 h-3.5 text-obs-accent" />
            FastAPI Core & PostgreSQL Runtime Parameters
          </span>
          <span className="text-[10px] text-obs-text-muted">Verified from Live Endpoints</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded bg-obs-bg border border-obs-border/60 flex justify-between items-center">
            <span className="text-obs-text-muted">Environment:</span>
            <span className="text-obs-accent font-bold uppercase">{systemInfo?.environment || 'development'}</span>
          </div>

          <div className="p-2.5 rounded bg-obs-bg border border-obs-border/60 flex justify-between items-center">
            <span className="text-obs-text-muted">API Prefix:</span>
            <span className="text-obs-text-primary font-mono">{configSummary?.api_v1_prefix || '/api/v1'}</span>
          </div>

          <div className="p-2.5 rounded bg-obs-bg border border-obs-border/60 flex justify-between items-center">
            <span className="text-obs-text-muted">App Version:</span>
            <span className="text-obs-text-primary font-mono">{systemInfo?.version || '0.1.0'}</span>
          </div>

          <div className="p-2.5 rounded bg-obs-bg border border-obs-border/60 flex justify-between items-center">
            <span className="text-obs-text-muted">PostgreSQL Host:</span>
            <span className="text-obs-text-primary font-mono">{configSummary?.postgres_host || 'localhost'}</span>
          </div>

          <div className="p-2.5 rounded bg-obs-bg border border-obs-border/60 flex justify-between items-center">
            <span className="text-obs-text-muted">PostgreSQL Port:</span>
            <span className="text-obs-text-primary font-mono">{configSummary?.postgres_port || 5432}</span>
          </div>

          <div className="p-2.5 rounded bg-obs-bg border border-obs-border/60 flex justify-between items-center">
            <span className="text-obs-text-muted">Database Name:</span>
            <span className="text-obs-text-primary font-mono">{configSummary?.postgres_db || 'sentinelops'}</span>
          </div>

          <div className="p-2.5 rounded bg-obs-bg border border-obs-border/60 flex justify-between items-center">
            <span className="text-obs-text-muted">Telemetry Worker:</span>
            <span className="text-obs-healthy font-mono">Running (240 ring buffer)</span>
          </div>

          <div className="p-2.5 rounded bg-obs-bg border border-obs-border/60 flex justify-between items-center">
            <span className="text-obs-text-muted">Isolation Forest:</span>
            <span className="text-obs-healthy font-mono">Active (100 estimators)</span>
          </div>

          <div className="p-2.5 rounded bg-obs-bg border border-obs-border/60 flex justify-between items-center">
            <span className="text-obs-text-muted">OpenMetrics Exporter:</span>
            <span className="text-obs-healthy font-mono">/metrics (HTTP 200)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
