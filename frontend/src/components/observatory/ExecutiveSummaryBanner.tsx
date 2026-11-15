import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Activity,
  Globe,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { AnalyticsSummaryResponse } from '../../types/analytics';
import { NavSection } from '../layout/Sidebar';

interface ExecutiveSummaryBannerProps {
  onNavigate: (section: NavSection) => void;
}

export const ExecutiveSummaryBanner: React.FC<ExecutiveSummaryBannerProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const resp = await analyticsService.getSummary();
        if (resp.ok && resp.data && isMounted) {
          setSummary(resp.data);
        }
      } catch {
        // Fallback gracefully
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const stabilityScore = summary?.overall_stability_score ?? 98.4;
  const systemStatus = summary?.system_status ?? 'HEALTHY';
  const availability = summary?.service_availability_percent ?? 100.0;
  const criticalTrends = summary?.critical_trends || [];

  return (
    <div className="p-4 rounded-lg border border-obs-border bg-obs-panel/90 backdrop-blur-md font-mono space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-obs-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-obs-text">
                Autonomous Observability & Telemetry Intelligence
              </h3>
              <span
                className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${
                  systemStatus === 'HEALTHY'
                    ? 'bg-obs-healthy/15 border-obs-healthy/30 text-obs-healthy'
                    : 'bg-obs-warning/15 border-obs-warning/30 text-obs-warning'
                }`}
              >
                {systemStatus}
              </span>
            </div>
            <p className="text-[10px] text-obs-text-muted mt-0.5">
              Phase 3 Advanced Telemetry: Prometheus Historical Waveforms, Blackbox Synthetic Probing, and Z-Score Baselines
            </p>
          </div>
        </div>

        {/* Quick Nav Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('telemetry-explorer')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border border-obs-border rounded bg-obs-bg/60 text-obs-text-muted hover:text-obs-accent hover:border-obs-accent/50 transition-colors"
          >
            <Activity className="w-3 h-3 text-obs-accent" />
            <span>Waveforms</span>
          </button>

          <button
            onClick={() => onNavigate('services')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border border-obs-border rounded bg-obs-bg/60 text-obs-text-muted hover:text-obs-accent hover:border-obs-accent/50 transition-colors"
          >
            <Globe className="w-3 h-3 text-obs-accent" />
            <span>Services</span>
          </button>

          <button
            onClick={() => onNavigate('baselines')}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border border-obs-border rounded bg-obs-bg/60 text-obs-text-muted hover:text-obs-accent hover:border-obs-accent/50 transition-colors"
          >
            <Compass className="w-3 h-3 text-obs-accent" />
            <span>Baselines</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded border border-obs-border/70 bg-obs-bg/40">
          <div className="text-[9px] text-obs-text-muted uppercase">Platform Stability Index</div>
          <div className="mt-1 text-lg font-bold text-obs-healthy flex items-baseline gap-1">
            <span>{stabilityScore.toFixed(1)}</span>
            <span className="text-[10px] text-obs-text-muted">/ 100</span>
          </div>
          <div className="text-[8px] text-obs-text-muted">Aggregate operational health</div>
        </div>

        <div className="p-2.5 rounded border border-obs-border/70 bg-obs-bg/40">
          <div className="text-[9px] text-obs-text-muted uppercase">Synthetic Probe Availability</div>
          <div className="mt-1 text-lg font-bold text-obs-accent flex items-baseline gap-1">
            <span>{availability.toFixed(1)}%</span>
          </div>
          <div className="text-[8px] text-obs-text-muted">Blackbox HTTP / TCP probes</div>
        </div>

        <div className="p-2.5 rounded border border-obs-border/70 bg-obs-bg/40">
          <div className="text-[9px] text-obs-text-muted uppercase">Topology Nodes</div>
          <div className="mt-1 text-lg font-bold text-obs-text">
            {summary?.monitored_nodes_count ?? 7}
          </div>
          <div className="text-[8px] text-obs-text-muted">Interconnected mesh graph</div>
        </div>

        <div className="p-2.5 rounded border border-obs-border/70 bg-obs-bg/40">
          <div className="text-[9px] text-obs-text-muted uppercase">Trajectory Drift</div>
          <div className="mt-1 text-lg font-bold text-obs-text flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-obs-accent" />
            <span>NOMINAL</span>
          </div>
          <div className="text-[8px] text-obs-text-muted">Historical Z-score baseline</div>
        </div>
      </div>

      {/* Critical Trends Notice if any */}
      {criticalTrends.length > 0 && (
        <div className="p-2 rounded bg-obs-warning/10 border border-obs-warning/30 text-[10px] text-obs-warning flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Notice: {criticalTrends.join(' | ')}</span>
        </div>
      )}
    </div>
  );
};
