import React from 'react';
import { ShieldAlert, Bell, SlidersHorizontal, CheckCheck } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Incident Management & Alerting</h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated triage, multi-channel dispatch, escalation policies, and incident timelines.
          </p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
          Scheduled: Phase 4
        </span>
      </div>

      <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-5">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Automated Incident Response Matrix</h3>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          Phase 4 will introduce automated incident lifecycle management, severity categorization (P1 - P4),
          intelligent deduplication, and integration with Slack, PagerDuty, and email webhooks.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left font-mono text-xs">
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Bell className="h-4 w-4 text-rose-400 mb-2" />
            <div className="font-bold text-slate-200">Alert Routing</div>
            <div className="text-slate-400 text-[11px] mt-1">Multi-tier escalation trees and duty schedule integration</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <SlidersHorizontal className="h-4 w-4 text-amber-400 mb-2" />
            <div className="font-bold text-slate-200">De-duplication</div>
            <div className="text-slate-400 text-[11px] mt-1">Suppresses alert storms by grouping correlated events</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <CheckCheck className="h-4 w-4 text-emerald-400 mb-2" />
            <div className="font-bold text-slate-200">Auto-Remediation</div>
            <div className="text-slate-400 text-[11px] mt-1">Self-healing playbooks for service restarts and cache evictions</div>
          </div>
        </div>
      </div>
    </div>
  );
};

