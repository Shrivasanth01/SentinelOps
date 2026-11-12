import React, { useState } from 'react';
import {
  Sparkles,
  GitBranch,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  BrainCircuit,
  Activity,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface InvestigationFinding {
  id: string;
  timestamp: string;
  title: string;
  service: string;
  severity: 'critical' | 'warning' | 'info';
  confidence: number; // 0-100%
  rootCauseHypothesis: string;
  affectedComponents: string[];
  evidence: string[];
  suggestedAction: string;
  status: 'active' | 'investigating' | 'resolved';
}

interface AIInvestigationPanelProps {
  activeFindings?: InvestigationFinding[];
  isAnalyzing?: boolean;
  onRunbookTrigger?: (findingId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export const AIInvestigationPanel: React.FC<AIInvestigationPanelProps> = ({
  activeFindings = [],
  isAnalyzing = false,
  onRunbookTrigger,
  onRefresh,
  className = '',
}) => {
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    activeFindings[0]?.id || null
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'hypothesis' | 'evidence' | 'remediation'>('hypothesis');

  const selectedFinding =
    activeFindings.find((f) => f.id === selectedFindingId) || activeFindings[0];

  const getSeverityBadge = (severity: InvestigationFinding['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-obs-critical border-obs-critical/30 bg-obs-critical/10';
      case 'warning':
        return 'text-obs-warning border-obs-warning/30 bg-obs-warning/10';
      case 'info':
      default:
        return 'text-obs-accent border-obs-accent/30 bg-obs-accent/10';
    }
  };

  return (
    <div
      className={`rounded-lg border border-obs-border bg-obs-panel/90 backdrop-blur-sm overflow-hidden flex flex-col transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl bg-obs-panel border-obs-accent/40' : ''
      } ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-obs-border/70 bg-obs-bg-secondary/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shadow-sm shadow-obs-accent/10">
            <BrainCircuit className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-semibold tracking-wider uppercase text-obs-text-primary">
                AIOps Autonomous Investigator
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-obs-accent/10 border border-obs-accent/30 text-obs-accent">
                MODEL: ISOLATION-LLM-V1
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              Continuous root-cause hypothesis generation and telemetry correlation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isAnalyzing}
              className="p-1.5 rounded border border-obs-border bg-obs-panel hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors disabled:opacity-50"
              title="Rerun Correlative Analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-obs-accent' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded border border-obs-border bg-obs-panel hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors"
            title={isExpanded ? 'Collapse panel' : 'Maximize panel'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Body */}
      {activeFindings.length === 0 ? (
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-full border border-obs-border bg-obs-bg/50 flex items-center justify-center text-obs-text-muted">
            <Sparkles className="w-6 h-6 text-obs-accent/60" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-mono font-semibold uppercase tracking-wider text-obs-text-primary">
              Observatory Telemetry Normal
            </p>
            <p className="text-xs text-obs-text-secondary max-w-sm">
              No cross-service anomalies or incident signals currently require autonomous AI investigation. The telemetry correlation engine is listening on all active streams.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-obs-text-muted pt-2">
            <Activity className="w-3 h-3 text-obs-healthy animate-pulse" />
            <span>Telemetry streams synchronized: 100% healthy</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 divide-y md:divide-y-0 md:divide-x divide-obs-border">
          {/* Finding Selector Rail (Left) */}
          <div className="md:col-span-4 p-3 space-y-2 bg-obs-bg-secondary/30 overflow-y-auto max-h-[420px]">
            <div className="text-[10px] font-mono uppercase tracking-wider text-obs-text-muted px-1">
              Active Investigations ({activeFindings.length})
            </div>
            {activeFindings.map((finding) => (
              <button
                key={finding.id}
                onClick={() => setSelectedFindingId(finding.id)}
                className={`w-full text-left p-2.5 rounded border transition-all text-xs font-mono ${
                  selectedFinding?.id === finding.id
                    ? 'border-obs-accent/50 bg-obs-accent/10 shadow-sm'
                    : 'border-obs-border/60 bg-obs-panel hover:bg-obs-surface hover:border-obs-border text-obs-text-secondary'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`px-1.5 py-0.5 text-[9px] uppercase font-semibold rounded border ${getSeverityBadge(
                      finding.severity
                    )}`}
                  >
                    {finding.severity}
                  </span>
                  <span className="text-[10px] text-obs-text-muted">
                    {finding.confidence}% CONFIDENCE
                  </span>
                </div>
                <div className="font-sans font-medium text-obs-text-primary line-clamp-1 mb-1">
                  {finding.title}
                </div>
                <div className="flex items-center justify-between text-[10px] text-obs-text-muted">
                  <span>{finding.service}</span>
                  <span>{finding.timestamp}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Finding Detail Workspace (Right) */}
          {selectedFinding && (
            <div className="md:col-span-8 p-4 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[420px]">
              <div>
                {/* Finding Header */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-obs-border/70">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-obs-accent font-semibold">
                        [INV-{selectedFinding.id.slice(0, 6).toUpperCase()}]
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded border uppercase ${getSeverityBadge(
                          selectedFinding.severity
                        )}`}
                      >
                        {selectedFinding.severity}
                      </span>
                      <span className="text-[10px] font-mono text-obs-text-muted">
                        Target: <span className="text-obs-text-primary">{selectedFinding.service}</span>
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-obs-text-primary">
                      {selectedFinding.title}
                    </h4>
                  </div>

                  {/* Confidence Bar */}
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-obs-text-muted uppercase">
                      Confidence Score
                    </div>
                    <div className="text-base font-mono font-bold text-obs-accent">
                      {selectedFinding.confidence}%
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs */}
                <div className="flex items-center gap-4 mt-3 border-b border-obs-border/60">
                  <button
                    onClick={() => setActiveTab('hypothesis')}
                    className={`pb-2 text-xs font-mono font-medium transition-colors border-b-2 ${
                      activeTab === 'hypothesis'
                        ? 'border-obs-accent text-obs-accent'
                        : 'border-transparent text-obs-text-secondary hover:text-obs-text-primary'
                    }`}
                  >
                    Root-Cause Hypothesis
                  </button>
                  <button
                    onClick={() => setActiveTab('evidence')}
                    className={`pb-2 text-xs font-mono font-medium transition-colors border-b-2 ${
                      activeTab === 'evidence'
                        ? 'border-obs-accent text-obs-accent'
                        : 'border-transparent text-obs-text-secondary hover:text-obs-text-primary'
                    }`}
                  >
                    Evidence Trail ({selectedFinding.evidence.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('remediation')}
                    className={`pb-2 text-xs font-mono font-medium transition-colors border-b-2 ${
                      activeTab === 'remediation'
                        ? 'border-obs-accent text-obs-accent'
                        : 'border-transparent text-obs-text-secondary hover:text-obs-text-primary'
                    }`}
                  >
                    Remediation Runbook
                  </button>
                </div>

                {/* Tab Contents */}
                <div className="mt-3 text-xs leading-relaxed">
                  {activeTab === 'hypothesis' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded border border-obs-border bg-obs-bg-secondary/40 font-mono text-obs-text-primary">
                        {selectedFinding.rootCauseHypothesis}
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase text-obs-text-muted mb-1.5 flex items-center gap-1.5">
                          <GitBranch className="w-3 h-3 text-obs-accent" />
                          Affected Infrastructure Nodes:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedFinding.affectedComponents.map((comp, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[11px] font-mono bg-obs-surface border border-obs-border text-obs-text-secondary"
                            >
                              {comp}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'evidence' && (
                    <div className="space-y-2">
                      {selectedFinding.evidence.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded border border-obs-border/70 bg-obs-bg/60 font-mono text-[11px] text-obs-text-secondary"
                        >
                          <Search className="w-3.5 h-3.5 text-obs-accent mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'remediation' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded border border-obs-border bg-obs-bg/60">
                        <div className="text-[10px] font-mono uppercase text-obs-warning mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Recommended Mitigation
                        </div>
                        <p className="text-obs-text-primary font-mono text-xs">
                          {selectedFinding.suggestedAction}
                        </p>
                      </div>

                      {onRunbookTrigger && (
                        <button
                          onClick={() => onRunbookTrigger(selectedFinding.id)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded bg-obs-accent/20 border border-obs-accent text-obs-accent hover:bg-obs-accent/30 font-mono text-xs font-semibold transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Execute Automated Diagnostic Runbook
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Footer */}
              <div className="pt-3 border-t border-obs-border/70 flex items-center justify-between text-[10px] font-mono text-obs-text-muted">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-obs-healthy" />
                  <span>Cross-node correlation verified by AIOps Engine</span>
                </div>
                <span>Status: {selectedFinding.status.toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
