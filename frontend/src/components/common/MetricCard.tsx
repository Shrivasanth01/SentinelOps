import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: React.ReactNode;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'indigo';
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  accentColor = 'blue',
  onClick,
  className = '',
}) => {
  const accentStyles = {
    blue: 'border-blue-500/20 hover:border-blue-500/40 text-blue-400 bg-blue-500/10',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    amber: 'border-amber-500/20 hover:border-amber-500/40 text-amber-400 bg-amber-500/10',
    rose: 'border-rose-500/20 hover:border-rose-500/40 text-rose-400 bg-rose-500/10',
    cyan: 'border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
    indigo: 'border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
  }[accentColor];

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border border-navy-700/60 bg-navy-900/80 p-5 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-blue-950/30 ${
        onClick ? 'cursor-pointer hover:border-navy-600' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`rounded-lg p-2.5 ${accentStyles}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">
          {value}
        </span>
      </div>

      {(subtitle || badge) && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {badge && <div>{badge}</div>}
        </div>
      )}
    </div>
  );
};

