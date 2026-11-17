import { useState, useEffect, useCallback, useRef } from 'react';
import { mlService } from '../services/mlService';
import {
  MLStatusResponse,
  FeatureSchemaResponse,
  ModelMetadata,
  AnomalyEvent,
  AnomalyDetectionResponse,
  AnomalySummaryResponse,
  AnomalyTimelineResponse,
  ModelTrainRequest,
  ModelTrainResponse,
} from '../types/ml';

export type AnomalyWorkspaceTab = 'radar' | 'timeline' | 'features' | 'models';

export function useAnomalyIntelligence(autoRefresh: boolean = true, refreshIntervalMs: number = 10000) {
  const [activeTab, setActiveTab] = useState<AnomalyWorkspaceTab>('radar');
  const [status, setStatus] = useState<MLStatusResponse | null>(null);
  const [latestDetection, setLatestDetection] = useState<AnomalyDetectionResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [summary, setSummary] = useState<AnomalySummaryResponse | null>(null);
  const [timeline, setTimeline] = useState<AnomalyTimelineResponse | null>(null);
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [featuresSchema, setFeaturesSchema] = useState<FeatureSchemaResponse | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  // Load Status
  const loadStatus = useCallback(async () => {
    try {
      const res = await mlService.getStatus();
      if (isMountedRef.current && res.data) {
        setStatus(res.data);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        console.error('Failed to load ML status:', err);
      }
    }
  }, []);

  // Run live detection on current host metrics
  const triggerLiveDetection = useCallback(async (persist: boolean = true) => {
    setIsDetecting(true);
    try {
      const res = await mlService.detectAnomaly({ persist });
      if (isMountedRef.current && res.data) {
        setLatestDetection(res.data);
        if (res.data.prediction === 'ANOMALOUS') {
          // Refresh list if anomaly occurred
          loadAnomalies();
          loadSummary();
        }
      }
    } catch (err: any) {
      console.error('Inference error:', err);
    } finally {
      if (isMountedRef.current) {
        setIsDetecting(false);
      }
    }
  }, []);

  // Load Anomalies List
  const loadAnomalies = useCallback(async (hours: number = 24) => {
    try {
      const res = await mlService.listAnomalies({ limit: 100, hours });
      if (isMountedRef.current && res.data) {
        setAnomalies(res.data);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to fetch anomaly events');
      }
    }
  }, []);

  // Load Summary
  const loadSummary = useCallback(async (hours: number = 24) => {
    try {
      const res = await mlService.getSummary(hours);
      if (isMountedRef.current && res.data) {
        setSummary(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load anomaly summary:', err);
    }
  }, []);

  // Load Timeline
  const loadTimeline = useCallback(async (hours: number = 24) => {
    try {
      const res = await mlService.getTimeline(hours, 300);
      if (isMountedRef.current && res.data) {
        setTimeline(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load timeline:', err);
    }
  }, []);

  // Load Models
  const loadModels = useCallback(async () => {
    try {
      const res = await mlService.listModels();
      if (isMountedRef.current && res.data) {
        setModels(res.data.models);
      }
    } catch (err: any) {
      console.error('Failed to load model registry:', err);
    }
  }, []);

  // Load Features Schema
  const loadFeatures = useCallback(async () => {
    try {
      const res = await mlService.getFeaturesSchema();
      if (isMountedRef.current && res.data) {
        setFeaturesSchema(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load feature schema:', err);
    }
  }, []);

  // Initial Full Load
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadStatus(),
        loadAnomalies(),
        loadSummary(),
        loadTimeline(),
        loadModels(),
        loadFeatures(),
        triggerLiveDetection(true),
      ]);
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Error syncing anomaly intelligence workspace');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadStatus, loadAnomalies, loadSummary, loadTimeline, loadModels, loadFeatures, triggerLiveDetection]);

  useEffect(() => {
    isMountedRef.current = true;
    refreshAll();

    return () => {
      isMountedRef.current = false;
    };
  }, [refreshAll]);

  // Polling loop for live detection & status updates
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      triggerLiveDetection(true);
      loadStatus();
      loadSummary();
    }, refreshIntervalMs);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshIntervalMs, triggerLiveDetection, loadStatus, loadSummary]);

  // Actions
  const trainNewModel = async (params: ModelTrainRequest): Promise<ModelTrainResponse | null> => {
    setIsTraining(true);
    setError(null);
    try {
      const res = await mlService.trainModel(params);
      if (res.data) {
        await Promise.all([loadModels(), loadStatus()]);
        return res.data;
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Model training failed');
      throw err;
    } finally {
      setIsTraining(false);
    }
  };

  const activateModel = async (modelId: string) => {
    try {
      await mlService.activateModel(modelId);
      await Promise.all([loadModels(), loadStatus(), triggerLiveDetection(false)]);
    } catch (err: any) {
      setError(err.message || 'Model activation failed');
      throw err;
    }
  };

  const acknowledgeAnomaly = async (id: string, notes: string, operator: string = 'Operator') => {
    try {
      const res = await mlService.acknowledgeAnomaly(id, {
        acknowledged_by: operator,
        notes,
      });
      if (res.data) {
        // Update local state
        setAnomalies(prev => prev.map(a => (a.id === id ? res.data! : a)));
        if (selectedAnomaly && selectedAnomaly.id === id) {
          setSelectedAnomaly(res.data);
        }
        loadSummary();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge anomaly');
      throw err;
    }
  };

  return {
    activeTab,
    setActiveTab,
    status,
    latestDetection,
    anomalies,
    summary,
    timeline,
    models,
    featuresSchema,
    selectedAnomaly,
    setSelectedAnomaly,
    isTrainingModalOpen,
    setIsTrainingModalOpen,
    loading,
    isDetecting,
    isTraining,
    error,
    refreshAll,
    triggerLiveDetection,
    trainNewModel,
    activateModel,
    acknowledgeAnomaly,
    loadTimeline,
    loadAnomalies,
    loadModels,
  };
}
