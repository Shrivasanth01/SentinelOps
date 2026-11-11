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
          />
        );
      case 'infrastructure':
        return <InfrastructurePage />;
      case 'monitoring':
        return <MonitoringPage />;
      case 'logs':
        return <LogsPage />;
      case 'anomalies':
        return <AnomaliesPage />;
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

