import React from 'react';
import { HealthStatus } from '../../types/health';

interface StatusBadgeProps {
  status: HealthStatus | 'online' | 'offline' | 'pending';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  showPulse = true,
}) => {
  const normalized = status.toLowerCase();

  const getStyle = () => {
    switch (normalized) {
      case 'healthy':
      case 'online':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          pulse: 'bg-emerald-400',
          defaultLabel: 'HEALTHY',
        };
      case 'degraded':
      case 'pending':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400',
          pulse: 'bg-amber-400',
          defaultLabel: 'DEGRADED',
        };
      case 'unhealthy':
      case 'offline':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          pulse: 'bg-rose-400',
          defaultLabel: 'UNHEALTHY',
        };
      case 'checking':
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
          dot: 'bg-blue-400',
          pulse: 'bg-blue-400',
          defaultLabel: 'CHECKING',
        };
    }
  };

  const style = getStyle();
  const textLabel = label || style.defaultLabel;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs tracking-wider',
    lg: 'px-3.5 py-1.5 text-sm tracking-wider',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-mono font-medium uppercase ${style.bg} ${sizeClasses}`}
    >
      <span className="relative flex h-2 w-2">
        {showPulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.pulse}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
      </span>
      <span>{textLabel}</span>
    </span>
  );
};

