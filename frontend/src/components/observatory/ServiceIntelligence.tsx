import React, { useState } from 'react';
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Server,
} from 'lucide-react';
import { useServiceIntelligence } from '../../hooks/useServiceIntelligence';
import {
  MonitoredService,
  MonitoredServiceCreate,
  ProtocolType,
  ProbeModuleType,
} from '../../types/services';

export const ServiceIntelligence: React.FC = () => {
  const {
    servicesData,
    windowsData,
    isLoading,
    refresh,
    addService,
    deleteService,
    probeService,
  } = useServiceIntelligence(15000);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'windows'>('endpoints');
  const [probingId, setProbingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<MonitoredServiceCreate>({
    name: '',
    target_url: '',
    protocol: 'HTTP',
    probe_module: 'http_2xx',
    expected_status_code: 200,
    probe_interval_seconds: 30,
    timeout_seconds: 5.0,
    description: '',
    tags: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const services = servicesData?.services || [];
  const totalServices = servicesData?.total || 0;
  const upServices = servicesData?.up_count || 0;
  const downServices = servicesData?.down_count || 0;
  const availabilityRate = totalServices > 0 ? (upServices / totalServices) * 100 : 100;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Client-side SSRF validation check
    const trimmed = formData.target_url.trim();
    if (
      trimmed.includes('169.254.169.254') ||
      trimmed.includes('metadata.google.internal') ||
      trimmed.includes('metadata.azure.com')
    ) {
      setFormError('Security Violation: Target points to a restricted cloud metadata address (SSRF blocked).');
      return;
    }

    if (!trimmed) {
      setFormError('Target URL or host address cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    const result = await addService(formData);
    setIsSubmitting(false);

    if (result.success) {
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        target_url: '',
        protocol: 'HTTP',
        probe_module: 'http_2xx',
        expected_status_code: 200,
        probe_interval_seconds: 30,
        timeout_seconds: 5.0,
        description: '',
        tags: '',
      });
    } else {
      setFormError(result.error || 'Failed to register service target.');
    }
  };

  const handleInstantProbe = async (id: string) => {
    setProbingId(id);
    await probeService(id);
    setProbingId(null);
  };

  const getStatusBadge = (svc: MonitoredService) => {
    switch (svc.availability_status) {
      case 'UP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-obs-healthy/15 border border-obs-healthy/30 text-obs-healthy">
            <CheckCircle2 className="w-3 h-3" /> UP
          </span>
        );
      case 'DOWN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-obs-critical/15 border border-obs-critical/30 text-obs-critical">
            <XCircle className="w-3 h-3" /> DOWN
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-obs-warning/15 border border-obs-warning/30 text-obs-warning">
            <AlertTriangle className="w-3 h-3" /> DEGRADED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-obs-border/50 border border-obs-border text-obs-text-muted">
            <Clock className="w-3 h-3" /> UNKNOWN
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text">
              Service Availability & Blackbox Intelligence
            </h1>
            <div className="text-[10px] text-obs-text-muted">
              Continuous synthetic probes via Prometheus Blackbox Exporter & Native TCP
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border border-obs-accent bg-obs-accent/20 text-obs-accent hover:bg-obs-accent/30 transition-all shadow-[0_0_12px_rgba(88,166,255,0.2)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD MONITOR TARGET</span>
          </button>

          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-1.5 border border-obs-border rounded bg-obs-bg/60 text-obs-text-muted hover:text-obs-text hover:border-obs-accent transition-colors disabled:opacity-50"
            title="Refresh Services"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-obs-accent' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Active Targets</div>
          <div className="mt-1 text-xl font-bold text-obs-text">{totalServices}</div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Configured synthetic probes</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Available (UP)</div>
          <div className="mt-1 text-xl font-bold text-obs-healthy">{upServices}</div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Endpoints responding OK</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Failing / Down</div>
          <div className={`mt-1 text-xl font-bold ${downServices > 0 ? 'text-obs-critical' : 'text-obs-text-muted'}`}>
            {downServices}
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Requiring immediate triage</div>
        </div>

        <div className="p-3 rounded-lg border border-obs-border bg-obs-panel/70">
          <div className="text-[10px] text-obs-text-muted tracking-wider uppercase">Availability SLA</div>
          <div className="mt-1 text-xl font-bold text-obs-accent">
            {availabilityRate.toFixed(1)}%
          </div>
          <div className="mt-1 text-[9px] text-obs-text-muted">Fleet availability index</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-obs-border/70 pb-1">
        <button
          onClick={() => setActiveTab('endpoints')}
          className={`px-3 py-1 text-xs font-semibold rounded-t transition-colors ${
            activeTab === 'endpoints'
              ? 'border-b-2 border-obs-accent text-obs-accent bg-obs-panel/50'
              : 'text-obs-text-muted hover:text-obs-text'
          }`}
        >
          CONFIGURED ENDPOINTS ({totalServices})
        </button>
        <button
          onClick={() => setActiveTab('windows')}
          className={`px-3 py-1 text-xs font-semibold rounded-t transition-colors ${
            activeTab === 'windows'
              ? 'border-b-2 border-obs-accent text-obs-accent bg-obs-panel/50'
              : 'text-obs-text-muted hover:text-obs-text'
          }`}
        >
          WINDOWS SERVICES ({windowsData?.total_services_monitored ?? 0})
        </button>
      </div>

      {/* Tab 1: Configured Monitored Endpoints */}
      {activeTab === 'endpoints' && (
        <div className="rounded-lg border border-obs-border bg-obs-panel/90 overflow-hidden">
          {services.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Globe className="w-10 h-10 text-obs-text-muted opacity-40 mb-2" />
              <div className="text-sm font-semibold text-obs-text">No Monitored Service Targets</div>
              <div className="text-xs text-obs-text-muted mt-1 max-w-sm">
                Add an internal microservice, API endpoint, or TCP port to start continuous synthetic health probing.
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 px-3 py-1.5 text-xs font-bold border border-obs-accent/60 rounded bg-obs-accent/10 text-obs-accent hover:bg-obs-accent/20"
              >
                + Register First Target
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-obs-border/80 bg-obs-bg/60 text-[10px] text-obs-text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Service Name</th>
                    <th className="py-2.5 px-3">Target Address</th>
                    <th className="py-2.5 px-3">Protocol</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">HTTP Code</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">TLS Cert</th>
                    <th className="py-2.5 px-3">Last Checked</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obs-border/40">
                  {services.map((svc) => (
                    <tr key={svc.id} className="hover:bg-obs-bg/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-obs-text">
                        <div className="flex items-center gap-1.5">
                          <span>{svc.name}</span>
                          {svc.tags && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-obs-bg text-obs-text-muted border border-obs-border">
                              {svc.tags.split(',')[0]}
                            </span>
                          )}
                        </div>
                        {svc.description && (
                          <div className="text-[10px] text-obs-text-muted truncate max-w-xs">{svc.description}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-obs-text-muted font-mono truncate max-w-[220px]" title={svc.target_url}>
                        {svc.target_url}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-obs-bg border border-obs-border text-[10px] text-obs-accent">
                          {svc.protocol}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{getStatusBadge(svc)}</td>
                      <td className="py-2.5 px-3">
                        {svc.http_status_code ? (
                          <span
                            className={`font-bold ${
                              svc.http_status_code >= 200 && svc.http_status_code < 300
                                ? 'text-obs-healthy'
                                : 'text-obs-critical'
                            }`}
                          >
                            {svc.http_status_code}
                          </span>
                        ) : (
                          <span className="text-obs-text-muted">--</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-obs-text">
                        {svc.response_time_ms ? `${svc.response_time_ms.toFixed(1)} ms` : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-obs-text-muted">
                        {svc.tls_cert_expiry_days !== null && svc.tls_cert_expiry_days !== undefined ? (
                          <span
                            className={
                              svc.tls_cert_expiry_days < 15
                                ? 'text-obs-critical font-bold'
                                : svc.tls_cert_expiry_days < 30
                                ? 'text-obs-warning'
                                : 'text-obs-healthy'
                            }
                          >
                            {svc.tls_cert_expiry_days.toFixed(0)}d
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-obs-text-muted">
                        {svc.last_successful_check
                          ? new Date(svc.last_successful_check).toLocaleTimeString()
                          : 'Pending'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInstantProbe(svc.id)}
                            disabled={probingId === svc.id}
                            className="p-1 rounded text-obs-text-muted hover:text-obs-accent hover:bg-obs-bg transition-colors"
                            title="Execute Instant Probe"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${probingId === svc.id ? 'animate-spin text-obs-accent' : ''}`} />
                          </button>
                          <button
                            onClick={() => deleteService(svc.id)}
                            className="p-1 rounded text-obs-text-muted hover:text-obs-critical hover:bg-obs-bg transition-colors"
                            title="Delete Target"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Windows Services Telemetry */}
      {activeTab === 'windows' && (
        <div className="rounded-lg border border-obs-border bg-obs-panel/90 overflow-hidden">
          <div className="p-3 border-b border-obs-border/70 flex items-center justify-between text-xs text-obs-text-muted">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-obs-accent" />
              <span>
                Host Windows Services Collector (Running: {windowsData?.running_count ?? 0} | Stopped: {windowsData?.stopped_count ?? 0})
              </span>
            </div>
            <span className="text-[10px] text-obs-healthy">COLLECTOR ACTIVE (PORT 9182)</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-obs-border/80 bg-obs-bg/60 text-[10px] text-obs-text-muted uppercase tracking-wider sticky top-0">
                  <th className="py-2 px-3">Service Identifier</th>
                  <th className="py-2 px-3">Display Name</th>
                  <th className="py-2 px-3">State</th>
                  <th className="py-2 px-3">Startup Mode</th>
                  <th className="py-2 px-3">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obs-border/40">
                {(windowsData?.services || []).map((ws) => (
                  <tr key={ws.name} className="hover:bg-obs-bg/40 transition-colors">
                    <td className="py-2 px-3 font-semibold text-obs-text font-mono">{ws.name}</td>
                    <td className="py-2 px-3 text-obs-text-muted truncate max-w-xs">{ws.display_name}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ws.state.toUpperCase() === 'RUNNING'
                            ? 'bg-obs-healthy/15 border border-obs-healthy/30 text-obs-healthy'
                            : 'bg-obs-border/50 text-obs-text-muted'
                        }`}
                      >
                        {ws.state.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-obs-text-muted font-mono">{ws.start_mode}</td>
                    <td className="py-2 px-3 text-[10px] text-obs-text-muted">{ws.run_as || 'LocalSystem'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Monitor Target Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-obs-border bg-obs-panel p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-obs-border">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-obs-accent" />
                <h3 className="text-sm font-bold text-obs-text tracking-wide uppercase">
                  Register Monitored Service Target
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-obs-text-muted hover:text-obs-text text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-2.5 rounded bg-obs-critical/15 border border-obs-critical/30 text-obs-critical text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-obs-text-muted uppercase mb-1">
                  Service Name <span className="text-obs-critical">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FastAPI Core Liveness"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded bg-obs-bg border border-obs-border text-obs-text focus:outline-none focus:border-obs-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] text-obs-text-muted uppercase mb-1">
                  Target URL / Address <span className="text-obs-critical">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="http://127.0.0.1:8000/api/v1/health/liveness"
                  value={formData.target_url}
                  onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded bg-obs-bg border border-obs-border text-obs-text focus:outline-none focus:border-obs-accent font-mono text-[11px]"
                />
                <p className="text-[9px] text-obs-text-muted mt-1">
                  SSRF Protected: Cloud metadata endpoints (169.254.x.x) are strictly denied.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-obs-text-muted uppercase mb-1">Protocol</label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => setFormData({ ...formData, protocol: e.target.value as ProtocolType })}
                    className="w-full px-2 py-1.5 rounded bg-obs-bg border border-obs-border text-obs-text focus:outline-none focus:border-obs-accent"
                  >
                    <option value="HTTP">HTTP</option>
                    <option value="HTTPS">HTTPS</option>
                    <option value="TCP">TCP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-obs-text-muted uppercase mb-1">Probe Module</label>
                  <select
                    value={formData.probe_module}
                    onChange={(e) => setFormData({ ...formData, probe_module: e.target.value as ProbeModuleType })}
                    className="w-full px-2 py-1.5 rounded bg-obs-bg border border-obs-border text-obs-text focus:outline-none focus:border-obs-accent"
                  >
                    <option value="http_2xx">HTTP 2xx</option>
                    <option value="http_post_2xx">HTTP POST 2xx</option>
                    <option value="tcp_connect">TCP Connect</option>
                    <option value="tls_connect">TLS Handshake</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-obs-text-muted uppercase mb-1">Interval (sec)</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={formData.probe_interval_seconds}
                    onChange={(e) => setFormData({ ...formData, probe_interval_seconds: parseInt(e.target.value) || 30 })}
                    className="w-full px-2.5 py-1.5 rounded bg-obs-bg border border-obs-border text-obs-text focus:outline-none focus:border-obs-accent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-obs-text-muted uppercase mb-1">Timeout (sec)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="30"
                    value={formData.timeout_seconds}
                    onChange={(e) => setFormData({ ...formData, timeout_seconds: parseFloat(e.target.value) || 5.0 })}
                    className="w-full px-2.5 py-1.5 rounded bg-obs-bg border border-obs-border text-obs-text focus:outline-none focus:border-obs-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-obs-text-muted uppercase mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="production,core,api"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded bg-obs-bg border border-obs-border text-obs-text focus:outline-none focus:border-obs-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-obs-border mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-obs-border text-obs-text-muted hover:text-obs-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded border border-obs-accent bg-obs-accent/30 text-obs-accent font-bold hover:bg-obs-accent/40 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
