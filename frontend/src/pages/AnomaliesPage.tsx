import React from 'react';
import {
  Brain,
  Activity,
  Clock,
  Layers,
  Sparkles,
  Zap,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAnomalyIntelligence } from '../hooks/useAnomalyIntelligence';
import { AnomalyOverview } from '../components/observatory/AnomalyOverview';
import { AnomalyTimeline } from '../components/observatory/AnomalyTimeline';
import { FeatureAnalysisView } from '../components/observatory/FeatureAnalysisView';
import { ModelRegistryView } from '../components/observatory/ModelRegistryView';
import { ModelTrainingModal } from '../components/observatory/ModelTrainingModal';
import { AnomalyInvestigationDrawer } from '../components/observatory/AnomalyInvestigationDrawer';

interface AnomaliesPageProps {
  backendConnected?: boolean;
}

export const AnomaliesPage: React.FC<AnomaliesPageProps> = ({
  backendConnected = true,
}) => {
  const {
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
  } = useAnomalyIntelligence(backendConnected, 10000);

  return (
    <div className="space-y-4 font-mono">
      {/* Top Observatory Scope Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border border-obs-border bg-obs-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-obs-accent/30 bg-obs-accent/10 flex items-center justify-center text-obs-accent shrink-0">
            <Brain className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider uppercase text-obs-text-primary">
                Unsupervised ML Anomaly Detection Engine
              </h1>
              <span className="px-1.5 py-0.2 text-[9px] rounded bg-obs-accent/15 border border-obs-accent/30 text-obs-accent font-mono font-bold">
                ISOLATION FOREST
              </span>
              <span className={`px-1.5 py-0.2 text-[9px] rounded font-mono font-bold ${
                status?.engine_status === 'ONLINE'
                  ? 'bg-obs-healthy/15 text-obs-healthy border border-obs-healthy/30'
                  : 'bg-obs-warning/15 text-obs-warning border border-obs-warning/30'
              }`}>
                {status?.engine_status ?? 'CONNECTING'}
              </span>
            </div>
            <p className="text-[11px] text-obs-text-muted">
              Continuous multi-dimensional infrastructure telemetry outlier detection with zero fabricated metrics
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => triggerLiveDetection(true)}
            disabled={isDetecting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors text-[11px] disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 text-obs-accent ${isDetecting ? 'animate-spin' : ''}`} />
            <span>Scan Live Telemetry</span>
          </button>

          <button
            onClick={() => setIsTrainingModalOpen(true)}
            disabled={isTraining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-obs-accent/40 bg-obs-accent/10 hover:bg-obs-accent/20 text-obs-accent text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
            <span>Calibrate Model</span>
          </button>

          <button
            onClick={refreshAll}
            disabled={loading}
            className="p-1.5 rounded border border-obs-border bg-obs-bg-secondary hover:bg-obs-surface text-obs-text-secondary hover:text-obs-text-primary transition-colors"
            title="Refresh All"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-3 rounded-lg border border-obs-critical/40 bg-obs-critical/15 text-obs-critical text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={refreshAll}
            className="px-2 py-0.5 rounded bg-obs-panel border border-obs-border text-[10px] text-obs-text-primary hover:bg-obs-surface"
          >
            Retry
          </button>
        </div>
      )}

      {/* Observatory Workspace Tabs */}
      <div className="flex items-center gap-1 border-b border-obs-border/60 pb-1 text-xs">
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex items-center gap-2 px-3 py-2 rounded-t font-semibold transition-colors ${
            activeTab === 'radar'
              ? 'border-b-2 border-obs-accent text-obs-accent bg-obs-panel/50'
              : 'text-obs-text-muted hover:text-obs-text-primary'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Multivariate Radar</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-3 py-2 rounded-t font-semibold transition-colors ${
            activeTab === 'timeline'
              ? 'border-b-2 border-obs-accent text-obs-accent bg-obs-panel/50'
              : 'text-obs-text-muted hover:text-obs-text-primary'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Anomaly Timeline & Log</span>
          {summary && summary.anomalous_count > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-obs-warning/20 text-obs-warning border border-obs-warning/40">
              {summary.anomalous_count}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-3 py-2 rounded-t font-semibold transition-colors ${
            activeTab === 'features'
              ? 'border-b-2 border-obs-accent text-obs-accent bg-obs-panel/50'
              : 'text-obs-text-muted hover:text-obs-text-primary'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Feature Analysis</span>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`flex items-center gap-2 px-3 py-2 rounded-t font-semibold transition-colors ${
            activeTab === 'models'
              ? 'border-b-2 border-obs-accent text-obs-accent bg-obs-panel/50'
              : 'text-obs-text-muted hover:text-obs-text-primary'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Model Registry & Rollback</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-obs-bg-secondary text-obs-text-muted border border-obs-border">
            {models.length}
          </span>
        </button>
      </div>

      {/* Tab Content Views */}
      {activeTab === 'radar' && (
        <AnomalyOverview
          detection={latestDetection}
          status={status}
          summary={summary}
          isDetecting={isDetecting}
          onTriggerDetection={() => triggerLiveDetection(true)}
          onOpenTrainModal={() => setIsTrainingModalOpen(true)}
        />
      )}

      {activeTab === 'timeline' && (
        <AnomalyTimeline
          timeline={timeline}
          anomalies={anomalies}
          onSelectAnomaly={anom => setSelectedAnomaly(anom)}
          onQuickAcknowledge={id => acknowledgeAnomaly(id, 'Quick acknowledged by SRE on call', 'Operator')}
        />
      )}

      {activeTab === 'features' && (
        <FeatureAnalysisView
          schema={featuresSchema}
          detection={latestDetection}
        />
      )}

      {activeTab === 'models' && (
        <ModelRegistryView
          models={models}
          onActivateModel={activateModel}
          onOpenTrainModal={() => setIsTrainingModalOpen(true)}
        />
      )}

      {/* Model Training Modal */}
      <ModelTrainingModal
        isOpen={isTrainingModalOpen}
        onClose={() => setIsTrainingModalOpen(false)}
        onTrain={trainNewModel}
        isTraining={isTraining}
      />

      {/* Anomaly Deep Investigation Drawer */}
      <AnomalyInvestigationDrawer
        anomaly={selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
        onAcknowledge={acknowledgeAnomaly}
      />
    </div>
  );
};
