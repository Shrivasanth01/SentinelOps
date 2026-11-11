import React from 'react';
import { Sparkles, Bot, Network, FileSearch } from 'lucide-react';

export const AIAssistantPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">AI Assistant & Root-Cause Analysis</h1>
          <p className="text-sm text-slate-400 mt-1">
            LLM-driven log investigation, automatic RCA generation, and natural language infrastructure querying.
          </p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
          Scheduled: Phase 4
        </span>
      </div>

      <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
        <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
          <Sparkles className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Cognitive AIOps Intelligence</h3>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          The AI Assistant is reserved for Phase 4. It will combine LLM reasoning with platform graphs
          to summarize cascading failures and generate executable mitigation suggestions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left font-mono text-xs">
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Network className="h-4 w-4 text-blue-400 mb-2" />
            <div className="font-bold text-slate-200">Root-Cause Graph</div>
            <div className="text-slate-400 text-[11px] mt-1">Dependency graph traversal pinpointing culprit origin</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <FileSearch className="h-4 w-4 text-cyan-400 mb-2" />
            <div className="font-bold text-slate-200">Log Synthesis</div>
            <div className="text-slate-400 text-[11px] mt-1">Correlates 100k+ log lines into concise incident summaries</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Bot className="h-4 w-4 text-indigo-400 mb-2" />
            <div className="font-bold text-slate-200">Ops Copilot</div>
            <div className="text-slate-400 text-[11px] mt-1">Chat interface for query execution, runbooks and commands</div>
          </div>
        </div>
      </div>
    </div>
  );
};

