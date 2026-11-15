import React, { useState } from 'react';
import {
  Server,
  PlusCircle,
  Trash2,
  CheckCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { LogSource, LogSourceCreate, LogSourceType, LogFormat } from '../../types/logs';

interface LogSourceManagerProps {
  sources: LogSource[];
  isLoading: boolean;
  onCreateSource: (source: LogSourceCreate) => Promise<{ ok: boolean; error?: string }>;
  onDeleteSource: (id: string) => Promise<{ ok: boolean }>;
  onRefresh: () => void;
}

export const LogSourceManager: React.FC<LogSourceManagerProps> = ({
  sources,
  isLoading,
  onCreateSource,
  onDeleteSource,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<LogSourceType>('APPLICATION_LOG');
  const [formTarget, setFormTarget] = useState('logs/application.log');
  const [formFormat, setFormFormat] = useState<LogFormat>('JSON');
  const [formDesc, setFormDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenModal = () => {
    setFormName('');
    setFormType('APPLICATION_LOG');
    setFormTarget('logs/app.log');
    setFormFormat('JSON');
    setFormDesc('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleTypeChange = (type: LogSourceType) => {
    setFormType(type);
    if (type === 'WINDOWS_EVENT') {
      setFormTarget('System');
      setFormFormat('WINDOWS_XML');
    } else if (type === 'FILE') {
      setFormTarget('logs/audit.log');
      setFormFormat('JSON');
    } else if (type === 'CONTAINER_LOG') {
      setFormTarget('sentinelops-backend');
      setFormFormat('RAW_TEXT');
    } else {
      setFormTarget('logs/service.log');
      setFormFormat('JSON');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTarget.trim()) {
      setErrorMsg('Name and target channel/path are required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const res = await onCreateSource({
      name: formName.trim(),
      source_type: formType,
      channel_or_path: formTarget.trim(),
      format: formFormat,
      description: formDesc.trim() || undefined,
      enabled: true,
    });

    setSubmitting(false);
    if (res.ok) {
      setIsModalOpen(false);
    } else {
      setErrorMsg(res.error || 'Failed to register source. Verify channel authorization or file path constraints.');
    }
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header Bar */}
      <div className="p-4 bg-[#0D1420] border border-[#243247] rounded flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#58A6FF]" />
            <span className="font-semibold text-[#E6EDF3] tracking-wide">
              CONFIGURED TELEMETRY LOG SOURCES
            </span>
          </div>
          <p className="text-[11px] text-[#8B949E] mt-0.5">
            Active Windows Event channels, monitored log files, Docker container streams, and in-memory collectors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-1.5 bg-[#162235] hover:bg-[#1E2E47] text-[#C9D1D9] border border-[#2B3F5D] rounded transition-colors"
            title="Refresh sources"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenModal}
            className="px-3 py-1.5 bg-[#162235] hover:bg-[#1E2E47] text-[#58A6FF] border border-[#2B3F5D] rounded font-semibold flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>REGISTER SOURCE</span>
          </button>
        </div>
      </div>

      {/* Sources Table */}
      <div className="bg-[#080B12] border border-[#243247] rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F1726] border-b border-[#243247] text-[#8B949E] text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">SOURCE NAME</th>
                <th className="py-2.5 px-3">PIPELINE TYPE</th>
                <th className="py-2.5 px-3">CHANNEL / TARGET PATH</th>
                <th className="py-2.5 px-3">FORMAT</th>
                <th className="py-2.5 px-3">HEALTH STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2536] text-[11px]">
              {sources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#8B949E]">
                    {isLoading ? 'Loading configured log sources...' : 'No log sources configured.'}
                  </td>
                </tr>
              ) : (
                sources.map((src) => (
                  <tr key={src.id} className="hover:bg-[#111B29] transition-colors">
                    <td className="py-2.5 px-3 font-medium text-[#E6EDF3]">
                      <div>{src.name}</div>
                      {src.description && (
                        <div className="text-[10px] text-[#8B949E]">{src.description}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#58A6FF]">
                      <span className="px-1.5 py-0.5 bg-[#162235] border border-[#26374E] rounded">
                        {src.source_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#C9D1D9] font-mono">
                      {src.channel_or_path}
                    </td>
                    <td className="py-2.5 px-3 text-[#8B949E]">{src.format}</td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1.5 text-[#36D399]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{src.collection_status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onDeleteSource(src.id)}
                        className="p-1 text-[#8B949E] hover:text-[#FF5555] rounded transition-colors inline-block"
                        title="Delete source"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Registration Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1420] border border-[#243247] rounded-lg max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#243247] pb-3">
              <span className="text-sm font-semibold text-[#E6EDF3] flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#58A6FF]" /> REGISTER LOG COLLECTION SOURCE
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8B949E] hover:text-[#E6EDF3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-[#FF5555] text-[11px]">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] text-[#8B949E] block mb-1">Source Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Host System Events, Auth Service Logs"
                  className="w-full px-2.5 py-1.5 bg-[#080B12] border border-[#243247] rounded text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#8B949E] block mb-1">Source Type</label>
                  <select
                    value={formType}
                    onChange={(e) => handleTypeChange(e.target.value as LogSourceType)}
                    className="w-full px-2.5 py-1.5 bg-[#080B12] border border-[#243247] rounded text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
                  >
                    <option value="APPLICATION_LOG">APPLICATION_LOG</option>
                    <option value="WINDOWS_EVENT">WINDOWS_EVENT</option>
                    <option value="FILE">FILE</option>
                    <option value="CONTAINER_LOG">CONTAINER_LOG</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#8B949E] block mb-1">Log Format</label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value as LogFormat)}
                    className="w-full px-2.5 py-1.5 bg-[#080B12] border border-[#243247] rounded text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
                  >
                    <option value="JSON">JSON</option>
                    <option value="WINDOWS_XML">WINDOWS_XML</option>
                    <option value="LOGFMT">LOGFMT</option>
                    <option value="RAW_TEXT">RAW_TEXT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#8B949E] block mb-1">
                  Channel or Target File Path
                </label>
                <input
                  type="text"
                  required
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  placeholder="e.g. System, Application, or logs/service.log"
                  className="w-full px-2.5 py-1.5 bg-[#080B12] border border-[#243247] rounded text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
                />
                <span className="text-[10px] text-[#8B949E] mt-1 block">
                  Path traversal (`..`) and Windows/Linux root system directories are strictly forbidden.
                </span>
              </div>

              <div>
                <label className="text-[11px] text-[#8B949E] block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Notes or operational description..."
                  className="w-full px-2.5 py-1.5 bg-[#080B12] border border-[#243247] rounded text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#243247]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-[#8B949E] hover:text-[#E6EDF3]"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#162235] hover:bg-[#1E2E47] text-[#58A6FF] border border-[#2B3F5D] rounded font-semibold transition-colors disabled:opacity-50"
                >
                  {submitting ? 'VALIDATING...' : 'REGISTER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
