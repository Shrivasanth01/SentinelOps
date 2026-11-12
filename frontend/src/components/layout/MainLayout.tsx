import React, { useState, useEffect } from 'react';
import { Sidebar, NavSection } from './Sidebar';
import { Topbar } from './Topbar';
import { HealthState } from '../../hooks/useHealth';
import { DiagnosticsModal } from '../dashboard/DiagnosticsModal';
import { CommandPalette } from '../observatory/CommandPalette';
import { logService } from '../../services/logService';
import { anomalyService } from '../../services/anomalyService';

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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEmitTestLog = async () => {
    try {
      await logService.simulateLog(
        'WARNING',
        'sentinelops-test',
        'Telemetry test log probe dispatched from Command Palette'
      );
      onRefresh();
    } catch {
      // Ignored if network probe is offline
    }
  };

  const handleTriggerAnomalyScan = async () => {
    try {
      await anomalyService.retrainModel();
      onRefresh();
    } catch {
      // Ignored if network probe is offline
    }
  };

  return (
    <div className="flex h-screen bg-obs-bg text-obs-text-primary font-sans overflow-hidden">
      {/* Contextual Slim Navigation Rail */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        backendConnected={healthState.backendConnected}
        databaseConnected={databaseConnectedState(healthState)}
      />

      {/* Main Command Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Signature Top Command Bar */}
        <Topbar
          currentSection={activeSection}
          environment={healthState.systemInfo?.environment}
          backendConnected={healthState.backendConnected}
          databaseConnected={databaseConnectedState(healthState)}
          lastUpdated={healthState.lastUpdated}
          isRefreshing={healthState.isRefreshing}
          onRefresh={onRefresh}
          telemetry={healthState.telemetry}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Scrollable Observatory Canvas */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto w-full observatory-grid">
          {children}
        </main>
      </div>

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        healthState={healthState}
      />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(sec) => {
          onSelectSection(sec);
          setIsCommandPaletteOpen(false);
        }}
        onTriggerScan={handleTriggerAnomalyScan}
        onEmitTestLog={handleEmitTestLog}
        onOpenDiagnostics={() => {
          setIsCommandPaletteOpen(false);
          setIsDiagnosticsOpen(true);
        }}
      />
    </div>
  );
};

function databaseConnectedState(healthState: HealthState): boolean {
  return healthState.databaseConnected;
}
