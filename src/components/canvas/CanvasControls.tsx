import React, { useRef } from 'react';
import {
  Save,
  Play,
  Video,
  Clock,
  Download,
  Upload,
  Undo2,
  Redo2,
  Check
} from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext.js';
import { useExecution } from '../../context/ExecutionContext.js';
import { api } from '../../lib/api.js';

interface CanvasControlsProps {
  onOpenRecorder: () => void;
  onOpenSchedule: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({
  onOpenRecorder,
  onOpenSchedule
}) => {
  const { workflow, saveWorkflow, isDirty, isSaving, canUndo, canRedo, undo, redo, setWorkflow } = useWorkflow();
  const { startLiveExecution } = useExecution();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    try {
      await saveWorkflow();
    } catch (err) {
      alert('Failed to save workflow');
    }
  };

  const handleRun = async () => {
    try {
      let wfId = workflow?.id;
      if (!wfId || wfId.startsWith('new_') || isDirty) {
        const saved = await saveWorkflow();
        if (saved) wfId = saved.id;
      }
      if (wfId) {
        const res = await api.runWorkflow(wfId);
        startLiveExecution(res.executionId);
      }
    } catch (err: any) {
      alert(`Run error: ${err.message}`);
    }
  };

  const handleExportJson = () => {
    if (!workflow) return;
    const dataStr = JSON.stringify(
      {
        schemaVersion: '1.0',
        generator: 'FlowPilot Visual Automation Platform',
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        variables: workflow.variables,
        tags: workflow.tags
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_flowpilot.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const imported = await api.importWorkflow(parsed);
        setWorkflow(imported);
      } catch (err: any) {
        alert(`Invalid workflow JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/90 dark:bg-surface-900/90 backdrop-blur-md border border-surface-200 dark:border-surface-800 shadow-elevated">
      {/* Undo / Redo */}
      <div className="flex items-center border-r border-surface-200 dark:border-surface-800 pr-1.5 mr-0.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-2 rounded-xl text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-2 rounded-xl text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
          isDirty
            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
            : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200'
        }`}
      >
        {isSaving ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isDirty ? (
          <Save className="w-3.5 h-3.5" />
        ) : (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        )}
        <span>{isSaving ? 'Saving...' : isDirty ? 'Save Changes' : 'Saved'}</span>
      </button>

      {/* Primary Run Button */}
      <button
        onClick={handleRun}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-xs font-bold shadow-md hover:shadow-glow-brand transition-all group"
      >
        <Play className="w-3.5 h-3.5 fill-white group-hover:scale-110 transition-transform" />
        <span>Run Live</span>
      </button>

      {/* Record Workflow Button */}
      <button
        onClick={onOpenRecorder}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-surface-700 dark:text-surface-200 hover:text-red-600 dark:hover:text-red-400 text-xs font-medium border border-transparent hover:border-red-200 dark:hover:border-red-800/40 transition-colors"
        title="Record in real browser"
      >
        <Video className="w-3.5 h-3.5 text-red-500" />
        <span className="hidden sm:inline">Record</span>
      </button>

      {/* Schedule Button */}
      <button
        onClick={onOpenSchedule}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 text-xs font-medium transition-colors"
        title="Schedule automated cron runs"
      >
        <Clock className="w-3.5 h-3.5 text-purple-500" />
        <span className="hidden sm:inline">Schedule</span>
      </button>

      {/* Import / Export */}
      <div className="flex items-center border-l border-surface-200 dark:border-surface-800 pl-1.5 ml-0.5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJson}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          title="Import Workflow JSON"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleExportJson}
          className="p-2 rounded-xl text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          title="Export Workflow JSON"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
