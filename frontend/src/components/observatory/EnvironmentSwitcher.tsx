import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type Environment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';

interface EnvironmentSwitcherProps {
  currentEnv?: string;
  onEnvChange?: (env: Environment) => void;
}

export const EnvironmentSwitcher: React.FC<EnvironmentSwitcherProps> = ({
  currentEnv = 'DEVELOPMENT',
  onEnvChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Environment>(
    (currentEnv.toUpperCase() as Environment) || 'DEVELOPMENT'
  );

  const envs: { id: Environment; label: string; color: string; desc: string }[] = [
    {
      id: 'PRODUCTION',
      label: 'Production Cluster',
      color: 'bg-obs-healthy text-obs-healthy',
      desc: 'Live telemetry & customer traffic',
    },
    {
      id: 'STAGING',
      label: 'Staging Sandbox',
      color: 'bg-amber-400 text-amber-400',
      desc: 'Pre-flight testing & model evaluation',
    },
    {
      id: 'DEVELOPMENT',
      label: 'Local Dev Node',
      color: 'bg-obs-accent text-obs-accent',
      desc: 'Host kernel & container workspace',
    },
  ];

  const handleSelect = (env: Environment) => {
    setSelected(env);
    setIsOpen(false);
    onEnvChange?.(env);
  };

  const currentObj = envs.find((e) => e.id === selected) || envs[2];

  return (
    <div className="relative font-mono text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-obs-border bg-obs-panel hover:border-obs-accent/40 text-obs-text-primary transition-all shadow-sm"
      >
        <span className={`h-2 w-2 rounded-full ${currentObj.color.split(' ')[0]}`} />
        <span className="font-semibold uppercase tracking-wider">{selected}</span>
        <ChevronDown className="h-3.5 w-3.5 text-obs-text-muted" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-1.5 left-0 w-64 rounded-xl border border-obs-border bg-obs-panel/95 backdrop-blur-md p-1.5 shadow-2xl z-50 animate-fade-in">
            <div className="px-3 py-1.5 text-[10px] text-obs-text-muted uppercase tracking-wider border-b border-obs-border-subtle mb-1">
              Select Command Environment
            </div>
            {envs.map((e) => (
              <button
                key={e.id}
                onClick={() => handleSelect(e.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                  selected === e.id
                    ? 'bg-obs-accent/15 text-obs-accent font-semibold'
                    : 'text-obs-text-secondary hover:bg-obs-surface hover:text-obs-text-primary'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${e.color.split(' ')[0]}`} />
                  <div>
                    <div className="text-xs">{e.label}</div>
                    <div className="text-[10px] text-obs-text-muted">{e.desc}</div>
                  </div>
                </div>
                {selected === e.id && <Check className="h-3.5 w-3.5 text-obs-accent" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
