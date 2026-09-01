import React, { useEffect, useState, useRef } from 'react';
import {
  Workflow as WorkflowIcon,
  Plus,
  Play,
  Copy,
  Trash2,
  Download,
  Upload,
  Search,
  Zap,
  MoreVertical,
  Clock,
  CheckCircle2,
  Sparkles,
  Code2,
  Layers
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { Workflow } from '../../types/workflow.js';
import { useExecution } from '../../context/ExecutionContext.js';
import { useWorkflow } from '../../context/WorkflowContext.js';

interface WorkflowsPageProps {
  onOpenWorkflow: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const WorkflowsPage: React.FC<WorkflowsPageProps> = ({
  onOpenWorkflow,
  onNavigateTab
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const { startLiveExecution } = useExecution();
  const { resetWorkflow, setWorkflow } = useWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const list = await api.getWorkflows();
      setWorkflows(list || []);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleCreateNew = () => {
    resetWorkflow();
    onNavigateTab('editor');
  };

  const handleRun = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await api.runWorkflow(id);
      startLiveExecution(res.executionId);
    } catch (err: any) {
      alert(`Run failed: ${err.message}`);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.duplicateWorkflow(id);
      loadWorkflows();
    } catch (err: any) {
      alert(`Duplicate failed: ${err.message}`);
    }
    setMenuOpenId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await api.deleteWorkflow(id);
      loadWorkflows();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
    setMenuOpenId(null);
  };

  const handleExport = (e: React.MouseEvent, wf: Workflow) => {
    e.stopPropagation();
    const dataStr = JSON.stringify(wf, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wf.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_flowpilot.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpenId(null);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const imported = await api.importWorkflow(parsed);
        setWorkflow(imported);
        onNavigateTab('editor');
      } catch (err: any) {
        alert(`Failed to import JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filtered = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[11px] font-bold border border-brand-500/20 mb-1.5">
            <Zap className="w-3.5 h-3.5" />
            <span>Workflow Automation Pipelines</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-surface-900 dark:text-white">
            Automation Workflows
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400">
            Create, manage, and trigger visual automation pipelines across browser agents and local scripts.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 text-xs font-bold transition-all shadow-2xs"
            title="Import FlowPilot JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import JSON</span>
          </button>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white text-xs font-bold shadow-md hover:shadow-glow-brand transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Flow Canvas</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search workflows by name or description..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl text-xs text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs font-medium"
        />
      </div>

      {/* Workflows Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-surface-400">Loading workflows...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 p-8 shadow-subtle">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto shadow-xs">
            <Zap className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-surface-900 dark:text-white">
            {search ? 'No matching workflows found' : 'No workflows created yet'}
          </div>
          <p className="text-xs text-surface-400 max-w-sm mx-auto">
            {search
              ? 'Try changing your search query or clear the filter.'
              : 'Get started by creating your first visual flow or cloning a ready-to-use template.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm"
            >
              Create New Flow
            </button>
            <button
              onClick={() => onNavigateTab('templates')}
              className="px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs font-bold"
            >
              Browse Templates
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((wf) => (
            <div
              key={wf.id}
              onClick={() => onOpenWorkflow(wf.id)}
              className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800/90 shadow-subtle hover:shadow-elevated transition-all flex flex-col justify-between space-y-4 group relative cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h3 className="text-sm font-bold text-surface-900 dark:text-white group-hover:text-brand-500 transition-colors truncate">
                        {wf.name}
                      </h3>
                      <div className="text-[10px] text-surface-400 font-mono truncate">
                        {wf.trigger_type || 'manual'} trigger • {wf.nodes?.length || 0} steps
                      </div>
                    </div>
                  </div>

                  {/* Menu button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === wf.id ? null : wf.id);
                      }}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpenId === wf.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-surface-800 rounded-2xl shadow-elevated border border-surface-200 dark:border-surface-700 py-1.5 text-xs animate-in fade-in"
                      >
                        <button
                          onClick={(e) => handleDuplicate(e, wf.id)}
                          className="w-full px-3 py-2 flex items-center gap-2 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700/60 font-medium"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Duplicate</span>
                        </button>
                        <button
                          onClick={(e) => handleExport(e, wf)}
                          className="w-full px-3 py-2 flex items-center gap-2 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700/60 font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export JSON</span>
                        </button>
                        <div className="border-t border-surface-100 dark:border-surface-700 my-1" />
                        <button
                          onClick={(e) => handleDelete(e, wf.id)}
                          className="w-full px-3 py-2 flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-surface-600 dark:text-surface-300 line-clamp-2 leading-relaxed">
                  {wf.description || 'No description provided for this visual automation pipeline.'}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 font-mono font-bold">
                    {wf.nodes?.length || 0} nodes
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 font-mono">
                    Updated {new Date(wf.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 group-hover:underline">
                  Open Canvas →
                </span>
                <button
                  onClick={(e) => handleRun(e, wf.id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-2xs hover:shadow-glow-brand transition-all active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
