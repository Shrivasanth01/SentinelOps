import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Activity,
  Server,
  Cpu,
  Terminal,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Settings,
  Zap,
  RefreshCw,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { NavSection } from '../layout/Sidebar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: NavSection) => void;
  onTriggerScan?: () => void;
  onEmitTestLog?: () => void;
  onOpenDiagnostics?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Observability';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onTriggerScan,
  onEmitTestLog,
  onOpenDiagnostics,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-overview',
      title: 'Navigate: Platform Overview & Observatory Canvas',
      category: 'Navigation',
      icon: Activity,
      action: () => onNavigate('overview'),
      shortcut: 'G O',
    },
    {
      id: 'nav-infra',
      title: 'Navigate: Infrastructure Topology & Fleets',
      category: 'Navigation',
      icon: Server,
      action: () => onNavigate('infrastructure'),
      shortcut: 'G I',
    },
    {
      id: 'nav-mon',
      title: 'Navigate: Live Telemetry & System Monitoring',
      category: 'Navigation',
      icon: Cpu,
      action: () => onNavigate('monitoring'),
      shortcut: 'G M',
    },
    {
      id: 'nav-logs',
      title: 'Navigate: Log Aggregator & Live Stream Terminal',
      category: 'Navigation',
      icon: Terminal,
      action: () => onNavigate('logs'),
      shortcut: 'G L',
    },
    {
      id: 'nav-anom',
      title: 'Navigate: Machine Learning Anomaly Detection (Isolation Forest)',
      category: 'Navigation',
      icon: AlertTriangle,
      action: () => onNavigate('anomalies'),
      shortcut: 'G A',
    },
    {
      id: 'nav-inc',
      title: 'Navigate: Incident Management & Investigation Signals',
      category: 'Navigation',
      icon: ShieldAlert,
      action: () => onNavigate('incidents'),
    },
    {
      id: 'nav-ai',
      title: 'Navigate: AI Investigation Assistant & Root-Cause Copilot',
      category: 'Navigation',
      icon: Sparkles,
      action: () => onNavigate('ai-assistant'),
    },
    {
      id: 'nav-settings',
      title: 'Navigate: Platform Settings & API Gateway',
      category: 'Navigation',
      icon: Settings,
      action: () => onNavigate('settings'),
    },

    // Actions
    {
      id: 'act-scan',
      title: 'Run Diagnostic Anomaly Scan (Isolation Forest)',
      category: 'Actions',
      icon: Zap,
      action: () => onTriggerScan?.(),
      shortcut: 'Ctrl+S',
    },
    {
      id: 'act-log',
      title: 'Emit Diagnostic Warning Event to Syslog Stream',
      category: 'Actions',
      icon: RefreshCw,
      action: () => onEmitTestLog?.(),
    },
    {
      id: 'act-diag',
      title: 'Open Deep Diagnostic Explorer (Raw Endpoints & Correlation ID)',
      category: 'Actions',
      icon: Code2,
      action: () => onOpenDiagnostics?.(),
      shortcut: 'Ctrl+D',
    },

    // Observability Links
    {
      id: 'link-prom',
      title: 'Open Prometheus Metrics Scrape Target (/metrics)',
      category: 'Observability',
      icon: ExternalLink,
      action: () => window.open('http://127.0.0.1:8000/metrics', '_blank'),
    },
    {
      id: 'link-docs',
      title: 'Open FastAPI Interactive OpenAPI Docs (/api/v1/docs)',
      category: 'Observability',
      icon: ExternalLink,
      action: () => window.open('http://127.0.0.1:8000/api/v1/docs', '_blank'),
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((idx) => (idx + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((idx) => (idx - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono text-xs">
      <div className="relative w-full max-w-2xl rounded-2xl border border-obs-border bg-obs-panel shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-obs-border bg-obs-bg-secondary">
          <Search className="h-4 w-4 text-obs-accent flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search commands, workspaces, actions or telemetry targets... (Esc to close)"
            className="w-full bg-transparent text-obs-text-primary placeholder-obs-text-muted focus:outline-none text-xs"
          />
          <span className="px-2 py-0.5 rounded bg-obs-surface text-[10px] text-obs-text-muted border border-obs-border">
            ESC
          </span>
        </div>

        {/* Command Items List */}
        <div className="p-2 overflow-y-auto flex-1 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-obs-text-muted">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === idx;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-obs-accent/15 text-obs-text-primary border border-obs-accent/30'
                      : 'text-obs-text-secondary hover:bg-obs-surface border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg border ${
                        isSelected
                          ? 'bg-obs-accent/20 border-obs-accent/40 text-obs-accent'
                          : 'bg-obs-bg-secondary border-obs-border text-obs-text-muted'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className={`font-semibold ${isSelected ? 'text-white' : ''}`}>
                        {item.title}
                      </div>
                      <div className="text-[10px] text-obs-text-muted">{item.category}</div>
                    </div>
                  </div>

                  {item.shortcut && (
                    <span className="px-2 py-0.5 rounded bg-obs-bg-secondary text-[10px] text-obs-text-muted border border-obs-border">
                      {item.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Command Palette Footer */}
        <div className="px-4 py-2 border-t border-obs-border bg-obs-bg-secondary/60 flex items-center justify-between text-[11px] text-obs-text-muted">
          <span>Navigate with &uarr; &darr; &bull; Select with Enter</span>
          <span>SentinelOps Command Palette</span>
        </div>
      </div>
    </div>
  );
};
