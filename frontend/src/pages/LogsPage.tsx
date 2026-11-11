import React from 'react';
import { Terminal, Filter, FileText, Search } from 'lucide-react';

export const LogsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Log Aggregator & Streams</h1>
          <p className="text-sm text-slate-400 mt-1">
            Centralized syslog, structured JSON event streams, and real-time log ingestion.
          </p>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
          Scheduled: Phase 3
        </span>
      </div>

      <div className="rounded-2xl border border-navy-800 bg-navy-900/60 p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
        <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
          <Terminal className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">High-Throughput Log Pipeline</h3>
        <p className="text-sm text-slate-400 max-w-lg mb-6 leading-relaxed">
          Log ingestion is scheduled for Phase 3. It will connect structured streams from application containers,
          systemd journals, and network appliances into an indexed query engine.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-left font-mono text-xs">
          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Search className="h-4 w-4 text-blue-400 mb-2" />
            <div className="font-bold text-slate-200">Full-Text Regex</div>
            <div className="text-slate-400 text-[11px] mt-1">Sub-second query filtering across distributed nodes</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <Filter className="h-4 w-4 text-cyan-400 mb-2" />
            <div className="font-bold text-slate-200">Structured Parsing</div>
            <div className="text-slate-400 text-[11px] mt-1">Automatic JSON, Syslog, and Nginx log schema mapping</div>
          </div>

          <div className="p-4 rounded-xl border border-navy-800 bg-navy-850/80">
            <FileText className="h-4 w-4 text-indigo-400 mb-2" />
            <div className="font-bold text-slate-200">Live Tail Engine</div>
            <div className="text-slate-400 text-[11px] mt-1">WebSocket-powered streaming terminal view</div>
          </div>
        </div>
      </div>
    </div>
  );
};

