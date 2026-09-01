import React, { useEffect, useState } from 'react';
import {
  Zap,
  Play,
  Video,
  Layers,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Workflow as WorkflowIcon,
  ShieldCheck,
  Plus,
  Code2,
  Radio,
  Sparkles,
  Terminal
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useExecution } from '../../context/ExecutionContext.js';
import { useWorkflow } from '../../context/WorkflowContext.js';

interface DashboardPageProps {
  onNavigateTab: (tab: string) => void;
  onOpenWorkflow: (id: string) => void;
  onOpenRecorder: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onOpenWorkflow,
  onOpenRecorder
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { startLiveExecution } = useExecution();
  const { resetWorkflow } = useWorkflow();

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRunQuick = async (e: React.MouseEvent, wfId: string) => {
    e.stopPropagation();
    try {
      const res = await api.runWorkflow(wfId);
      startLiveExecution(res.executionId);
    } catch (err: any) {
      alert(`Run failed: ${err.message}`);
    }
  };

  const handleNewWorkflow = () => {
    resetWorkflow();
    onNavigateTab('editor');
  };

  const metrics = stats?.metrics || {
    totalWorkflows: 0,
    activeWorkflows: 0,
    totalSchedules: 0,
    totalCredentials: 0,
    successfulRuns: 0,
    failedRuns: 0,
    totalRuns: 0,
    successRate: 100
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-brand-950 p-6 sm:p-10 text-white overflow-hidden shadow-elevated border border-surface-800/80">
        {/* Ambient Gradient Blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xl text-xs font-bold text-brand-200 border border-white/15 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Next-Gen Visual Automation Engine</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
            Build zero-API-key automations with Python, Node.js & Browser agents.
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
            Seamlessly combine local Python scripts, Node.js async code, direct HTTP scraping, RSS news feeds, and Playwright browser control without complex cloud keys or fees.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <button
              onClick={handleNewWorkflow}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-sky-500 hover:from-brand-400 hover:to-sky-400 text-white text-xs font-bold shadow-md hover:shadow-glow-brand transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Flow Canvas</span>
            </button>
            <button
              onClick={() => onNavigateTab('templates')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md text-xs font-bold border border-white/20 transition-all"
            >
              <Layers className="w-4 h-4 text-purple-300" />
              <span>Zero-Key Starter Templates</span>
            </button>
            <button
              onClick={onOpenRecorder}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-white backdrop-blur-md text-xs font-bold border border-white/20 hover:border-red-500/40 transition-all"
            >
              <Video className="w-4 h-4 text-red-400" />
              <span>Browser Recorder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800/80 shadow-subtle hover:shadow-elevated transition-all flex items-center justify-between group">
          <div>
            <div className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Total Workflows</div>
            <div className="text-2xl font-extrabold text-surface-900 dark:text-white mt-1">
              {metrics.totalWorkflows}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{metrics.activeWorkflows} active flows</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <WorkflowIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800/80 shadow-subtle hover:shadow-elevated transition-all flex items-center justify-between group">
          <div>
            <div className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Automated Runs</div>
            <div className="text-2xl font-extrabold text-surface-900 dark:text-white mt-1">
              {metrics.totalRuns}
            </div>
            <div className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5 font-medium">
              <span className="text-emerald-500 font-bold">{metrics.successfulRuns} passed</span> • <span className="text-red-500 font-bold">{metrics.failedRuns} failed</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800/80 shadow-subtle hover:shadow-elevated transition-all flex items-center justify-between group">
          <div>
            <div className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Scheduled Tasks</div>
            <div className="text-2xl font-extrabold text-surface-900 dark:text-white mt-1">
              {metrics.totalSchedules}
            </div>
            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
              Automated Cron Engine
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800/80 shadow-subtle hover:shadow-elevated transition-all flex items-center justify-between group">
          <div>
            <div className="text-xs font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider">Encrypted Vault</div>
            <div className="text-2xl font-extrabold text-surface-900 dark:text-white mt-1">
              {metrics.totalCredentials}
            </div>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AES-256 GCM</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <Key className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Workflows & Recent Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workflows */}
        <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WorkflowIcon className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-bold text-surface-900 dark:text-white">Active Workflows</h2>
            </div>
            <button
              onClick={() => onNavigateTab('workflows')}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {!stats?.recentWorkflows || stats.recentWorkflows.length === 0 ? (
              <div className="py-12 text-center text-xs text-surface-400">
                No workflows created yet. Click "New Flow Canvas" to build your first flow!
              </div>
            ) : (
              stats.recentWorkflows.map((wf: any) => (
                <div
                  key={wf.id}
                  onClick={() => onOpenWorkflow(wf.id)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200/60 dark:border-surface-700/50 cursor-pointer group transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 shadow-2xs">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-surface-900 dark:text-white group-hover:text-brand-500 transition-colors truncate">
                        {wf.name}
                      </div>
                      <div className="text-[10px] text-surface-400 truncate">
                        {wf.description || 'No description provided'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleRunQuick(e, wf.id)}
                      className="px-3 py-1 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Run</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Executions */}
        <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <h2 className="text-sm font-bold text-surface-900 dark:text-white">Recent Execution Runs</h2>
            </div>
            <button
              onClick={() => onNavigateTab('runs')}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>View all runs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {!stats?.recentExecutions || stats.recentExecutions.length === 0 ? (
              <div className="py-12 text-center text-xs text-surface-400">
                No runs executed yet. Run a workflow to view real-time logs and output.
              </div>
            ) : (
              stats.recentExecutions.map((exec: any) => (
                <div
                  key={exec.id}
                  onClick={() => onNavigateTab('runs')}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200/60 dark:border-surface-700/50 cursor-pointer group transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-surface-200 dark:bg-surface-700 flex items-center justify-center shrink-0">
                      {exec.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : exec.status === 'RUNNING' ? (
                        <Zap className="w-4 h-4 text-brand-500 animate-bounce" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-surface-900 dark:text-white truncate">
                        {exec.workflow_name || 'Workflow Run'}
                      </div>
                      <div className="text-[10px] text-surface-400 font-mono truncate">
                        {exec.id} • {exec.duration_ms ? `${exec.duration_ms}ms` : 'In progress'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      exec.status === 'SUCCESS'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                        : exec.status === 'RUNNING'
                        ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 animate-pulse'
                        : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60'
                    }`}
                  >
                    {exec.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
