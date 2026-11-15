import React, { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { NavSection } from './components/layout/Sidebar';
import { useHealth } from './hooks/useHealth';
import { OverviewPage } from './pages/OverviewPage';
import { InfrastructurePage } from './pages/InfrastructurePage';
import { MonitoringPage } from './pages/MonitoringPage';
import { LogsPage } from './pages/LogsPage';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { SettingsPage } from './pages/SettingsPage';
import { TelemetryExplorer } from './components/observatory/TelemetryExplorer';
import { ServiceIntelligence } from './components/observatory/ServiceIntelligence';
import { PerformanceBaselines } from './components/observatory/PerformanceBaselines';

export const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [pollInterval, setPollInterval] = useState<number>(5000);

  const healthState = useHealth(pollInterval, pollInterval > 0);

  const renderCurrentPage = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <OverviewPage
            healthState={healthState}
            onRefresh={healthState.refresh}
            onNavigate={setActiveSection}
          />
        );
      case 'telemetry-explorer':
        return <TelemetryExplorer />;
      case 'services':
        return <ServiceIntelligence />;
      case 'baselines':
        return <PerformanceBaselines />;
      case 'infrastructure':
        return <InfrastructurePage backendConnected={healthState.backendConnected} />;
      case 'monitoring':
        return <MonitoringPage backendConnected={healthState.backendConnected} />;
      case 'logs':
        return <LogsPage backendConnected={healthState.backendConnected} />;
      case 'anomalies':
        return <AnomaliesPage backendConnected={healthState.backendConnected} />;
      case 'incidents':
        return <IncidentsPage />;
      case 'ai-assistant':
        return <AIAssistantPage />;
      case 'settings':
        return (
          <SettingsPage
            healthState={healthState}
            pollInterval={pollInterval}
            onSetPollInterval={setPollInterval}
          />
        );
      default:
        return (
          <OverviewPage
            healthState={healthState}
            onRefresh={healthState.refresh}
            onNavigate={setActiveSection}
          />
        );
    }
  };

  return (
    <MainLayout
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      healthState={healthState}
      onRefresh={healthState.refresh}
    >
      {renderCurrentPage()}
    </MainLayout>
  );
};

export default App;

