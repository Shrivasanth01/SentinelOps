import React, { useState } from 'react';
import { Hash, Copy, Check, Filter } from 'lucide-react';
import { ErrorIntelligenceResponse } from '../../types/logs';

interface ErrorIntelligenceProps {
  data: ErrorIntelligenceResponse | null;
  isLoading: boolean;
  onFilterPattern: (pattern: string) => void;
}

export const ErrorIntelligence: React.FC<ErrorIntelligenceProps> = ({
  data,
  isLoading,
  onFilterPattern,
}) => {
  const [copiedFp, setCopiedFp] = useState<string | null>(null);

  const handleCopyFp = (fp: string) => {
    navigator.clipboard.writeText(fp);
    setCopiedFp(fp);
    setTimeout(() => setCopiedFp(null), 1500);
  };

  const groups = data?.groups || [];
  const totalErrors = data?.total_errors || 0;
  const uniquePatterns = data?.unique_patterns || 0;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 bg-[#0D1420] border border-[#243247] rounded">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1">
            Total Captured Errors
          </span>
          <span className="text-2xl font-bold text-[#FF5555]">
            {totalErrors.toLocaleString()}
          </span>
        </div>

        <div className="p-4 bg-[#0D1420] border border-[#243247] rounded">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1">
            Unique Error Patterns
          </span>
          <span className="text-2xl font-bold text-[#F5B942]">
            {uniquePatterns.toLocaleString()}
          </span>
        </div>

        <div className="p-4 bg-[#0D1420] border border-[#243247] rounded">
          <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1">
            Grouping Algorithm
          </span>
          <span className="text-xs font-semibold text-[#58A6FF] block mt-1">
            Deterministic MD5 Fingerprinting + Regex Masking
          </span>
        </div>
      </div>

      {/* Pattern Cards List */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <div className="p-8 text-center bg-[#0D1420] border border-[#243247] rounded text-[#8B949E]">
            {isLoading
              ? 'Analyzing error patterns...'
              : 'Zero recurring error patterns recorded in active timeframe.'}
          </div>
        ) : (
          groups.map((group) => {
            const pct = totalErrors > 0 ? Math.round((group.count / totalErrors) * 100) : 0;

            return (
              <div
                key={group.fingerprint}
                className="p-4 bg-[#0B111D] border border-[#243247] hover:border-[#384D6D] rounded space-y-3 transition-colors"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-500/20 text-[#FF5555] font-bold border border-red-500/40 rounded text-[10px] uppercase">
                      {group.level}
                    </span>
                    <span className="text-[#58A6FF] font-semibold text-xs">
                      [{group.service}]
                    </span>
                    <button
                      onClick={() => handleCopyFp(group.fingerprint)}
                      className="text-[10px] text-[#8B949E] hover:text-[#C9D1D9] flex items-center gap-1 bg-[#162235] px-2 py-0.5 rounded border border-[#26374E]"
                      title="Copy fingerprint hash"
                    >
                      <Hash className="w-3 h-3 text-[#58A6FF]" />
                      <span>FP: {group.fingerprint}</span>
                      {copiedFp === group.fingerprint ? (
                        <Check className="w-3 h-3 text-[#36D399]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2.5 py-0.5 bg-[#162235] text-[#FF5555] font-bold border border-[#2A3C56] rounded">
                      {group.count} OCCURRENCES ({pct}%)
                    </span>
                    <button
                      onClick={() => onFilterPattern(group.sample_message)}
                      className="px-2.5 py-1 text-[11px] bg-[#162235] hover:bg-[#1E2E47] text-[#58A6FF] border border-[#2A3C56] rounded flex items-center gap-1 transition-colors"
                    >
                      <Filter className="w-3 h-3" />
                      <span>INVESTIGATE IN EXPLORER</span>
                    </button>
                  </div>
                </div>

                {/* Normalized Pattern Representation */}
                <div className="p-2.5 bg-[#080B12] border border-[#202E42] rounded text-[#C9D1D9] font-medium text-[11px]">
                  <span className="text-[10px] text-[#8B949E] uppercase tracking-wider block mb-1">
                    Normalized Error Pattern:
                  </span>
                  <code className="text-[#F5B942] break-words">{group.pattern}</code>
                </div>

                {/* Timestamps & Raw Sample */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#8B949E] pt-1 border-t border-[#1C2738]">
                  <div className="flex items-center gap-4">
                    <span>
                      First seen:{' '}
                      <strong className="text-[#C9D1D9]">
                        {new Date(group.first_seen).toLocaleTimeString()}
                      </strong>
                    </span>
                    <span>
                      Last seen:{' '}
                      <strong className="text-[#C9D1D9]">
                        {new Date(group.last_seen).toLocaleTimeString()}
                      </strong>
                    </span>
                  </div>
                  <span className="truncate max-w-md text-[10px] text-[#8B949E]">
                    Sample: {group.sample_message}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
