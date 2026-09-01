import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.js';
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext.js';
import { ExecutionProvider } from './context/ExecutionContext.js';

import { AppHeader } from './components/layout/AppHeader.js';
import { GlobalSearch } from './components/layout/GlobalSearch.js';
import { LiveRunModal } from './components/execution/LiveRunModal.js';
import { HumanChallengeModal } from './components/execution/HumanChallengeModal.js';

import { DashboardPage } from './components/pages/DashboardPage.js';
import { WorkflowsPage } from './components/pages/WorkflowsPage.js';
import { EditorPage } from './components/pages/EditorPage.js';
import { TemplatesPage } from './components/pages/TemplatesPage.js';
import { CredentialsPage } from './components/pages/CredentialsPage.js';
import { ProfilesPage } from './components/pages/ProfilesPage.js';
import { RunsPage } from './components/pages/RunsPage.js';
import { SchedulesPage } from './components/pages/SchedulesPage.js';
import { api } from './lib/api.js';

function MainApp() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const { setWorkflow, resetWorkflow } = useWorkflow();

  const handleOpenWorkflow = async (id: string) => {
    try {
      const full = await api.getWorkflow(id);
      setWorkflow(full);
      setCurrentTab('editor');
    } catch (err: any) {
      alert(`Failed to load workflow: ${err.message}`);
    }
  };

  const handleNewWorkflow = () => {
    resetWorkflow();
    setCurrentTab('editor');
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 flex flex-col font-sans">
      {/* Top Application Header */}
      <AppHeader
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openGlobalSearch={() => setIsSearchOpen(true)}
        onNewWorkflow={handleNewWorkflow}
      />

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentTab === 'dashboard' && (
          <DashboardPage
            onNavigateTab={setCurrentTab}
            onOpenWorkflow={handleOpenWorkflow}
            onOpenRecorder={() => setCurrentTab('editor')}
          />
        )}
        {currentTab === 'workflows' && (
          <WorkflowsPage
            onOpenWorkflow={handleOpenWorkflow}
            onNavigateTab={setCurrentTab}
          />
        )}
        {currentTab === 'editor' && <EditorPage />}
        {currentTab === 'templates' && <TemplatesPage onNavigateTab={setCurrentTab} />}
        {currentTab === 'credentials' && <CredentialsPage />}
        {currentTab === 'profiles' && <ProfilesPage />}
        {currentTab === 'runs' && <RunsPage />}
        {currentTab === 'schedules' && <SchedulesPage />}
      </main>

      {/* Global Modals */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectWorkflow={handleOpenWorkflow}
        onNavigateTab={setCurrentTab}
      />
      <LiveRunModal />
      <HumanChallengeModal />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <WorkflowProvider>
        <ExecutionProvider>
          <MainApp />
        </ExecutionProvider>
      </WorkflowProvider>
    </ThemeProvider>
  );
}

export default App;
