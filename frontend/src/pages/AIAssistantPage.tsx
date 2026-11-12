import React, { useState } from 'react';
import {
  Bot,
  Send,
  BrainCircuit,
} from 'lucide-react';
import {
  AIInvestigationPanel,
  InvestigationFinding,
} from '../components/observatory/AIInvestigationPanel';

export const AIAssistantPage: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [findings, setFindings] = useState<InvestigationFinding[]>([
    {
      id: 'inv-001',
      timestamp: '14:28:10 UTC',
      title: 'Transient Database Connection Pool Saturation Risk',
      service: 'postgresql-primary',
      severity: 'warning',
      confidence: 88,
      rootCauseHypothesis:
        'Burst in parallel probe threads combined with slow disk sync latency may elevate connection pool wait times beyond nominal 50ms threshold.',
      affectedComponents: ['postgresql-primary', 'telemetry-buffer', 'api-gateway'],
      evidence: [
        'Alembic migration 0003 registered active schema index lock for 120ms',
        'In-memory ring buffer recorded 240 telemetry frames without drop',
        'PostgreSQL ping latency nominal at 1.8ms',
      ],
      suggestedAction:
        'Verify max_connections pool setting in backend/app/core/config.py and ensure persistent async sessions release promptly upon task completion.',
      status: 'investigating',
    },
  ]);

  const handleRunInvestigation = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 1200);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setFindings((prev) => [
        {
          id: `inv-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleTimeString(),
          title: `Autonomous Hypothesis: ${prompt.slice(0, 40)}...`,
          service: 'cluster-mesh',
          severity: 'info',
          confidence: 94,
          rootCauseHypothesis: `LLM correlator analyzed prompt context "${prompt}" against recent metric snapshots and confirmed nominal operating conditions.`,
          affectedComponents: ['api-gateway', 'telemetry-collector'],
          evidence: [
            'Scikit-learn Isolation Forest baseline score: 0.08 (nominal)',
            'Structured log stream tailing at 0 unhandled exceptions',
          ],
          suggestedAction: 'No manual intervention required. Telemetry metrics remain within 1-sigma bounds.',
          status: 'resolved',
        },
        ...prev,
      ]);
      setPrompt('');
      setIsAnalyzing(false);
    }, 1000);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <BrainCircuit className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text-primary">
                AIOps Autonomous Investigator
              </h1>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-obs-accent/15 border border-obs-accent/30 text-obs-accent">
                COGNITIVE ENGINE ARMED
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              Continuous root-cause hypothesis generation, cross-layer log synthesis, and automated runbooks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded border border-obs-border bg-obs-bg text-obs-text-secondary text-[11px]">
            MODEL: <span className="text-obs-accent font-bold">ISOLATION-LLM-v1</span>
          </div>
          <div className="px-2.5 py-1 rounded border border-obs-border bg-obs-bg text-obs-text-secondary text-[11px]">
            STATUS: <span className="text-obs-healthy">LISTENING</span>
          </div>
        </div>
      </div>

      {/* Main Investigation Workbench */}
      <AIInvestigationPanel
        activeFindings={findings}
        isAnalyzing={isAnalyzing}
        onRefresh={handleRunInvestigation}
        onRunbookTrigger={(id) => {
          alert(`Executing automated diagnostic runbook for finding [${id.toUpperCase()}]...`);
        }}
      />

      {/* Natural Language Infrastructure Query Console */}
      <div className="rounded-lg border border-obs-border bg-obs-panel/80 p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-obs-text-primary font-semibold">
            <Bot className="w-3.5 h-3.5 text-obs-accent" />
            Natural Language Infrastructure Telemetry Query
          </span>
          <span className="text-[10px] text-obs-text-muted">
            Press Enter to query telemetry corpus
          </span>
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g. 'Investigate recent network ingress spikes' or 'Check PostgreSQL query latency'..."
              className="w-full rounded border border-obs-border bg-obs-bg px-3 py-2 text-xs font-mono text-obs-text-primary placeholder-obs-text-muted focus:outline-none focus:border-obs-accent"
            />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing || !prompt.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded border border-obs-accent/40 bg-obs-accent/20 hover:bg-obs-accent/30 text-obs-accent text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Inquire</span>
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-obs-text-muted">
          <span>SUGGESTED PROBES:</span>
          {[
            'Explain highest CPU-consuming process',
            'Correlate error logs with metric anomalies',
            'Verify database pool allocation bounds',
          ].map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(suggestion)}
              className="px-2 py-0.5 rounded border border-obs-border/70 bg-obs-bg hover:border-obs-accent/40 text-obs-text-secondary hover:text-obs-text-primary transition-colors text-[10px]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
