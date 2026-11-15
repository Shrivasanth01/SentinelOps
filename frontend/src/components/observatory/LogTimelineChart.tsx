import React from 'react';
import { TimelineBucket } from '../../types/logs';
import { BarChart3 } from 'lucide-react';

interface LogTimelineChartProps {
  buckets: TimelineBucket[];
  totalEvents: number;
  timeRange: string;
  onSelectBucket?: (bucket: TimelineBucket) => void;
}

export const LogTimelineChart: React.FC<LogTimelineChartProps> = ({
  buckets,
  totalEvents,
  timeRange,
  onSelectBucket,
}) => {
  if (!buckets || buckets.length === 0) {
    return (
      <div className="p-4 bg-[#0D1420] border border-[#243247] rounded flex items-center justify-center text-xs text-[#8B949E] font-mono">
        No log activity records in selected {timeRange} window.
      </div>
    );
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="p-4 bg-[#0D1420] border border-[#243247] rounded space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#58A6FF]" />
          <span className="font-semibold text-[#E6EDF3] tracking-wide">HISTORICAL VOLUME DISTRIBUTION</span>
          <span className="text-[11px] text-[#8B949E]">({timeRange})</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[#8B949E]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF5555]" />
            <span>Errors</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F5B942]" />
            <span>Warnings</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#58A6FF]" />
            <span>Nominal</span>
          </span>
          <span className="text-[#C9D1D9] font-medium ml-2">{totalEvents.toLocaleString()} events</span>
        </div>
      </div>

      {/* Histogram Bars */}
      <div className="flex items-end gap-1.5 h-16 pt-2">
        {buckets.map((bucket, idx) => {
          const heightPercent = Math.max(Math.round((bucket.count / maxCount) * 100), 4);
          const errors = (bucket.level_breakdown?.ERROR || 0) + (bucket.level_breakdown?.CRITICAL || 0);
          const warnings = bucket.level_breakdown?.WARNING || 0;
          const nominal = bucket.count - errors - warnings;

          const errorPct = bucket.count > 0 ? (errors / bucket.count) * 100 : 0;
          const warningPct = bucket.count > 0 ? (warnings / bucket.count) * 100 : 0;
          const nominalPct = bucket.count > 0 ? (nominal / bucket.count) * 100 : 0;

          return (
            <div
              key={idx}
              onClick={() => onSelectBucket && onSelectBucket(bucket)}
              className="flex-1 flex flex-col justify-end group relative cursor-pointer h-full"
            >
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col p-2 bg-[#162235] border border-[#2E3F59] rounded shadow-xl text-[10px] whitespace-nowrap z-30 pointer-events-none">
                <span className="text-[#E6EDF3] font-semibold">{bucket.time_label}</span>
                <span className="text-[#C9D1D9] mt-0.5">Total: {bucket.count}</span>
                {errors > 0 && <span className="text-[#FF5555]">Errors: {errors}</span>}
                {warnings > 0 && <span className="text-[#F5B942]">Warnings: {warnings}</span>}
                {nominal > 0 && <span className="text-[#58A6FF]">Info/Debug: {nominal}</span>}
              </div>

              {/* Stacked Bar Segment */}
              <div
                style={{ height: `${heightPercent}%` }}
                className="w-full rounded-sm overflow-hidden flex flex-col justify-end bg-[#162235] group-hover:brightness-125 transition-all"
              >
                {nominalPct > 0 && (
                  <div style={{ height: `${nominalPct}%` }} className="w-full bg-[#58A6FF]/60" />
                )}
                {warningPct > 0 && (
                  <div style={{ height: `${warningPct}%` }} className="w-full bg-[#F5B942]/80" />
                )}
                {errorPct > 0 && (
                  <div style={{ height: `${errorPct}%` }} className="w-full bg-[#FF5555]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Axis timestamps */}
      <div className="flex justify-between text-[10px] text-[#8B949E] pt-1 border-t border-[#1C2738]">
        <span>{buckets[0]?.time_label || 'Start'}</span>
        <span>{buckets[Math.floor(buckets.length / 2)]?.time_label || 'Mid'}</span>
        <span>{buckets[buckets.length - 1]?.time_label || 'Now'}</span>
      </div>
    </div>
  );
};
