import { useState, useEffect, useCallback } from 'react';
import { serviceMonitoringService } from '../services/serviceMonitoringService';
import {
  MonitoredService,
  MonitoredServiceCreate,
  MonitoredServiceUpdate,
  ServicesListResponse,
  WindowsServicesResponse,
} from '../types/services';

export function useServiceIntelligence(
  autoRefreshInterval: number = 15000,
  enabled: boolean = true
) {
  const [servicesData, setServicesData] = useState<ServicesListResponse | null>(null);
  const [windowsData, setWindowsData] = useState<WindowsServicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const [svcResp, winResp] = await Promise.all([
        serviceMonitoringService.listServices(),
        serviceMonitoringService.getWindowsServices(),
      ]);

      if (svcResp.ok && svcResp.data) {
        setServicesData(svcResp.data);
      }
      if (winResp.ok && winResp.data) {
        setWindowsData(winResp.data);
      }

      setError(svcResp.error || winResp.error || null);
    } catch (err: any) {
      setError(err?.message || 'Error communicating with service prober');
    } finally {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }
  }, [enabled]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (autoRefreshInterval <= 0 || !enabled) return;
    const interval = setInterval(fetchAll, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [fetchAll, autoRefreshInterval, enabled]);

  const addService = async (payload: MonitoredServiceCreate): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await serviceMonitoringService.createService(payload);
      if (res.ok && res.data) {
        await fetchAll();
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to create monitored service target' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Exception during service registration' };
    }
  };

  const updateService = async (
    serviceId: string,
    payload: MonitoredServiceUpdate
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await serviceMonitoringService.updateService(serviceId, payload);
      if (res.ok && res.data) {
        await fetchAll();
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to update monitored service' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Exception during update' };
    }
  };

  const deleteService = async (serviceId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await serviceMonitoringService.deleteService(serviceId);
      if (res.ok) {
        await fetchAll();
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to delete service' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Exception during deletion' };
    }
  };

  const probeService = async (serviceId: string): Promise<MonitoredService | null> => {
    try {
      const res = await serviceMonitoringService.getService(serviceId);
      if (res.ok && res.data) {
        // Update local item
        setServicesData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            services: prev.services.map((s) => (s.id === serviceId ? res.data! : s)),
          };
        });
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  };

  return {
    servicesData,
    windowsData,
    isLoading,
    error,
    lastRefreshed,
    refresh: fetchAll,
    addService,
    updateService,
    deleteService,
    probeService,
  };
}
