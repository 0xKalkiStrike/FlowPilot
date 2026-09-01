import React, { useState } from 'react';
import { WorkflowCanvas } from '../canvas/WorkflowCanvas.js';
import { NodePalette } from '../canvas/NodePalette.js';
import { NodeConfigPanel } from '../canvas/NodeConfigPanel.js';
import { CanvasControls } from '../canvas/CanvasControls.js';
import { RecorderModal } from '../recorder/RecorderModal.js';
import { useWorkflow } from '../../context/WorkflowContext.js';
import { Zap, Clock, ShieldCheck, Check, Edit2 } from 'lucide-react';
import { api } from '../../lib/api.js';

export const EditorPage: React.FC = () => {
  const { workflow, updateWorkflowDetails, isDirty, isSaving } = useWorkflow();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(workflow?.name || 'Untitled Workflow');
  const [desc, setDesc] = useState(workflow?.description || '');

  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [cronTime, setCronTime] = useState('09:00');
  const [cronFreq, setCronFreq] = useState('daily');

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (workflow) {
      updateWorkflowDetails(title, desc, workflow.tags || [], workflow.variables || {});
    }
  };

  const handleCreateSchedule = async () => {
    if (!workflow?.id) return;
    try {
      await api.createSchedule({
        workflow_id: workflow.id,
        name: `${workflow.name} (${cronFreq})`,
        frequency: cronFreq,
        time: cronTime
      });
      alert('Schedule created successfully! It will run automatically in background.');
      setIsScheduleModalOpen(false);
    } catch (err: any) {
      alert(`Failed to create schedule: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Workflow Builder Sub-Header */}
      <div className="h-11 border-b border-surface-200 dark:border-surface-800 bg-white/70 dark:bg-surface-900/70 backdrop-blur-md px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleBlur()}
              className="px-2 py-0.5 bg-surface-100 dark:bg-surface-800 border border-brand-500 rounded text-xs font-bold text-surface-900 dark:text-white focus:outline-none"
            />
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1.5 cursor-pointer group hover:bg-surface-100 dark:hover:bg-surface-800 px-2 py-1 rounded-lg transition-colors"
            >
              <span className="text-xs font-bold text-surface-900 dark:text-white">
                {workflow?.name || 'Untitled Workflow'}
              </span>
              <Edit2 className="w-3 h-3 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}

          <span className="text-[10px] text-surface-400 hidden sm:inline font-mono">
            {workflow?.nodes?.length || 0} nodes
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-[11px] text-surface-400">
            {isSaving ? (
              <span className="text-brand-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
                Saving...
              </span>
            ) : isDirty ? (
              <span className="text-amber-500 font-medium">Unsaved changes</span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                All changes saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <NodePalette />
        <WorkflowCanvas />
        <NodeConfigPanel />
        <CanvasControls
          onOpenRecorder={() => setIsRecorderOpen(true)}
          onOpenSchedule={() => setIsScheduleModalOpen(true)}
        />
      </div>

      {/* Browser Recorder Modal */}
      <RecorderModal isOpen={isRecorderOpen} onClose={() => setIsRecorderOpen(false)} />

      {/* Quick Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white">
              <Clock className="w-4 h-4 text-purple-500" />
              <span>Schedule Workflow Execution</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                  Frequency
                </label>
                <select
                  value={cronFreq}
                  onChange={(e) => setCronFreq(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Every Day</option>
                  <option value="weekly">Every Week (Monday)</option>
                  <option value="hourly">Every Hour</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-300 mb-1">
                  Run Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={cronTime}
                  onChange={(e) => setCronTime(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-200 dark:border-surface-800">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
