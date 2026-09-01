import React from 'react';
import {
  Zap,
  LayoutDashboard,
  Workflow as WorkflowIcon,
  Layers,
  Key,
  Globe,
  PlayCircle,
  Clock,
  Search,
  Moon,
  Sun,
  Laptop,
  Plus,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { useExecution } from '../../context/ExecutionContext.js';

interface AppHeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openGlobalSearch: () => void;
  onNewWorkflow: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentTab,
  setCurrentTab,
  openGlobalSearch,
  onNewWorkflow
}) => {
  const { theme, setTheme } = useTheme();
  const { status: executionStatus, openModal: openExecutionModal } = useExecution();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'workflows', label: 'Workflows', icon: WorkflowIcon },
    { id: 'editor', label: 'Flow Canvas', icon: Zap, highlight: true },
    { id: 'templates', label: 'Templates', icon: Layers },
    { id: 'credentials', label: 'Credentials', icon: Key },
    { id: 'profiles', label: 'Profiles', icon: Globe },
    { id: 'runs', label: 'Executions', icon: PlayCircle },
    { id: 'schedules', label: 'Schedules', icon: Clock }
  ];

  return (
    <header className="h-14 border-b border-surface-200/80 dark:border-surface-800/80 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 shadow-2xs">
      {/* Left: Brand */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className="flex items-center gap-2.5 group text-left focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-glow-brand group-hover:scale-105 transition-all">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-surface-900 via-brand-700 to-brand-500 dark:from-white dark:via-sky-200 dark:to-brand-400 bg-clip-text text-transparent">
                FlowPilot
              </span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                2.0
              </span>
            </div>
            <p className="text-[10px] text-surface-400 dark:text-surface-500 font-medium hidden sm:block">
              Zero-Key Automation & Browser Engine
            </p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-surface-100/70 dark:bg-surface-950/60 p-1 rounded-xl border border-surface-200/50 dark:border-surface-800/50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-white dark:bg-surface-800 text-brand-600 dark:text-brand-400 shadow-xs scale-[1.02]'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200 hover:bg-white/50 dark:hover:bg-surface-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-brand-500' : 'text-surface-400'}`} />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Active Execution Live Banner Button */}
        {executionStatus === 'RUNNING' && (
          <button
            onClick={openExecutionModal}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-600 dark:text-brand-400 text-xs font-bold animate-pulse shadow-glow-brand"
          >
            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
            <span>Running Execution...</span>
          </button>
        )}

        {executionStatus === 'PAUSED' && (
          <button
            onClick={openExecutionModal}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-bounce"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Human Verification</span>
          </button>
        )}

        {/* Global Search Trigger */}
        <button
          onClick={openGlobalSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-100/80 dark:bg-surface-800/80 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-500 dark:text-surface-400 text-xs transition-colors border border-surface-200/60 dark:border-surface-700/60 shadow-2xs"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Quick Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-md text-surface-400 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Theme Switcher */}
        <div className="flex items-center bg-surface-100/80 dark:bg-surface-800/80 rounded-xl p-0.5 border border-surface-200/60 dark:border-surface-700/60 shadow-2xs">
          <button
            onClick={() => setTheme('light')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              theme === 'light'
                ? 'bg-white dark:bg-surface-700 text-amber-500 shadow-xs'
                : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-200'
            }`}
            title="Light Theme"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              theme === 'dark'
                ? 'bg-white dark:bg-surface-700 text-brand-400 shadow-xs'
                : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-200'
            }`}
            title="Dark Theme"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              theme === 'system'
                ? 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 shadow-xs'
                : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-200'
            }`}
            title="System Theme"
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick New Workflow Button */}
        <button
          onClick={onNewWorkflow}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white text-xs font-bold shadow-sm hover:shadow-glow-brand transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Workflow</span>
        </button>
      </div>
    </header>
  );
};
