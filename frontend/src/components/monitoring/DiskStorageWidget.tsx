import React from 'react';
import { HardDrive, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { DiskMetrics } from '../../types/metrics';

interface DiskStorageWidgetProps {
  disk: DiskMetrics | undefined;
}

export const DiskStorageWidget: React.FC<DiskStorageWidgetProps> = ({ disk }) => {
  if (!disk) return null;

  const toGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

  return (
    <div className="rounded-2xl border border-navy-700/80 bg-navy-900/90 p-6 shadow-lg">
      <div className="flex items-center justify-between pb-4 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400 border border-cyan-500/20">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Storage Partitions</h3>
            <p className="text-xs text-slate-400 font-mono">Mounted Filesystems</p>
          </div>
        </div>

        <span className="text-xs font-mono px-2 py-0.5 rounded bg-navy-800 text-cyan-400 border border-navy-700">
          {disk.partitions.length} Mounts
        </span>
      </div>

      {/* Partitions List */}
      <div className="mt-5 space-y-4">
        {disk.partitions.map((part, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">{part.mountpoint}</span>
                <span className="text-[10px] text-slate-400 px-1 rounded bg-navy-800">
                  {part.fstype}
                </span>
              </div>
              <span className="text-slate-300">
                {toGB(part.used_bytes)} / {toGB(part.total_bytes)} GB ({part.percent}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-navy-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  part.percent > 85
                    ? 'bg-rose-500'
                    : part.percent > 70
                    ? 'bg-amber-500'
                    : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, part.percent))}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Cumulative IO */}
      <div className="mt-6 pt-4 border-t border-navy-800/80 grid grid-cols-2 gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
          <span>Read: {toGB(disk.read_bytes)} GB</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <ArrowUpFromLine className="h-4 w-4 text-blue-400" />
          <span>Write: {toGB(disk.write_bytes)} GB</span>
        </div>
      </div>
    </div>
  );
};
