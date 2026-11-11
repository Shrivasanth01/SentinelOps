import React, { useState } from 'react';
import { Sidebar, NavSection } from './Sidebar';
import { Topbar } from './Topbar';
import { HealthState } from '../../hooks/useHealth';
import { DiagnosticsModal } from '../dashboard/DiagnosticsModal';

interface MainLayoutProps {
  children: React.ReactNode;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  healthState: HealthState;
  onRefresh: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeSection,
  onSelectSection,
  healthState,
  onRefresh,
}) => {
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-navy-950 text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        backendConnected={healthState.backendConnected}
        databaseConnected={healthState.databaseConnected}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          currentSection={activeSection}
          environment={healthState.systemInfo?.environment}
          lastUpdated={healthState.lastUpdated}
          isRefreshing={healthState.isRefreshing}
          onRefresh={onRefresh}
          telemetry={healthState.telemetry}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        healthState={healthState}
      />
    </div>
  );
};

