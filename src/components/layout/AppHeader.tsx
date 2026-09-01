import React, { useState } from 'react';
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
  Menu,
  X
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const goTo = (tab: string) => {
    setCurrentTab(tab);
    setMobileNavOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-surface-200/80 bg-white/85 dark:border-surface-800/80 dark:bg-surface-950/85 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-surface-950/70">
        <div className="mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-3 px-3 sm:px-5 lg:px-6">
          <button
            onClick={() => goTo('dashboard')}
            className="flex min-w-0 items-center gap-2.5 rounded-2xl pr-1 text-left outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand-500/50"
            aria-label="Go to dashboard"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-brand-600 via-sky-500 to-indigo-500 text-white shadow-glow-brand">
              <Zap className="h-4 w-4 fill-white" />
            </div>
            <div className="min-w-0 leading-none">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-extrabold tracking-tight bg-gradient-to-r from-surface-900 via-brand-700 to-brand-500 bg-clip-text text-transparent dark:from-white dark:via-sky-200 dark:to-brand-400">
                  FlowPilot
                </span>
                <span className="rounded-full border border-brand-500/20 bg-brand-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                  2.0
                </span>
              </div>
              <p className="mt-1 hidden truncate text-[10px] font-medium text-surface-400 sm:block dark:text-surface-500">
                Zero-Key Automation & Browser Engine
              </p>
            </div>
          </button>

          <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex" aria-label="Primary navigation">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-surface-200/70 bg-surface-100/75 p-1 shadow-2xs dark:border-surface-800/70 dark:bg-surface-900/70">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-semibold transition-all xl:px-3 ${
                      active
                        ? 'bg-white text-brand-600 shadow-xs dark:bg-surface-800 dark:text-brand-400'
                        : 'text-surface-600 hover:bg-white/70 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800/60 dark:hover:text-surface-100'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? 'text-brand-500' : 'text-surface-400'}`} />
                    <span>{item.label}</span>
                    {item.highlight && <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {executionStatus === 'RUNNING' && (
              <button
                onClick={openExecutionModal}
                className="hidden items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-600 shadow-glow-brand sm:flex dark:text-brand-400"
              >
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
                <span>Running</span>
              </button>
            )}

            {executionStatus === 'PAUSED' && (
              <button
                onClick={openExecutionModal}
                className="hidden items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 sm:flex dark:text-amber-400"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Verification</span>
              </button>
            )}

            <button
              onClick={openGlobalSearch}
              className="flex h-10 items-center gap-2 rounded-xl border border-surface-200/80 bg-surface-100/80 px-3 text-surface-500 transition-colors hover:bg-surface-200 dark:border-surface-700/70 dark:bg-surface-900/80 dark:text-surface-400 dark:hover:bg-surface-800"
              title="Quick Search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden text-xs font-medium md:inline">Search</span>
              <kbd className="hidden rounded-md border border-surface-300 bg-white px-1.5 py-0.5 text-[9px] font-mono font-bold text-surface-400 shadow-2xs lg:inline dark:border-surface-700 dark:bg-surface-950">
                Ctrl K
              </kbd>
            </button>

            <div className="hidden items-center rounded-xl border border-surface-200/80 bg-surface-100/80 p-0.5 shadow-2xs sm:flex dark:border-surface-700/70 dark:bg-surface-900/80">
              <button
                onClick={() => setTheme('light')}
                className={`rounded-lg p-1.5 transition-colors ${theme === 'light' ? 'bg-white text-amber-500 shadow-xs dark:bg-surface-800' : 'text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'}`}
                title="Light theme"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`rounded-lg p-1.5 transition-colors ${theme === 'dark' ? 'bg-white text-brand-500 shadow-xs dark:bg-surface-800 dark:text-brand-400' : 'text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'}`}
                title="Dark theme"
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`rounded-lg p-1.5 transition-colors ${theme === 'system' ? 'bg-white text-surface-700 shadow-xs dark:bg-surface-800 dark:text-surface-200' : 'text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'}`}
                title="System theme"
              >
                <Laptop className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              onClick={onNewWorkflow}
              className="hidden h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 px-3.5 text-xs font-bold text-white shadow-sm transition-all hover:from-brand-500 hover:to-sky-400 hover:shadow-glow-brand active:scale-95 sm:flex"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Workflow</span>
            </button>

            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-surface-200/80 bg-surface-100/80 text-surface-600 transition-colors hover:bg-surface-200 lg:hidden dark:border-surface-700/70 dark:bg-surface-900/80 dark:text-surface-300 dark:hover:bg-surface-800"
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-surface-200/80 bg-white/95 px-3 py-3 shadow-lg backdrop-blur-2xl lg:hidden dark:border-surface-800/80 dark:bg-surface-950/95">
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-1.5 sm:grid-cols-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.id)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                        : 'text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-brand-500' : 'text-surface-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2 border-t border-surface-200/80 pt-3 dark:border-surface-800/80">
              <button
                onClick={onNewWorkflow}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 px-3 py-2.5 text-xs font-bold text-white shadow-sm"
              >
                <Plus className="h-4 w-4" />
                New Workflow
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="grid w-11 place-items-center rounded-xl border border-surface-200 bg-surface-100 text-surface-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
                title="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
