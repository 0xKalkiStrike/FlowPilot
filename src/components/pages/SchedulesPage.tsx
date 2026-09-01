import React, { useEffect, useState } from 'react';
import { Clock, Plus, Play, Trash2, CheckCircle2, RotateCw } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Schedule, Workflow } from '../../types/workflow.js';
import { useExecution } from '../../context/ExecutionContext.js';

export const SchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [workflowId, setWorkflowId] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [time, setTime] = useState('09:00');
  const [cronExp, setCronExp] = useState('');
  const [useCustomCron, setUseCustomCron] = useState(false);

  const { startLiveExecution } = useExecution();

  const loadData = async () => {
    try {
      setLoading(true);
      const [schList, wfList] = await Promise.all([
        api.getSchedules(),
        api.getWorkflows()
      ]);
      setSchedules(schList || []);
      setWorkflows(wfList || []);
      if (wfList && wfList.length > 0) {
        setWorkflowId(wfList[0].id);
        setName(`${wfList[0].name} (Daily)`);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id: string, current: number) => {
    try {
      await api.toggleSchedule(id, current === 0);
      loadData();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      const res = await api.triggerScheduleNow(id);
      startLiveExecution(res.executionId);
    } catch (err: any) {
      alert(`Trigger failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api.deleteSchedule(id);
      loadData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowId || !name) return;
    try {
      await api.createSchedule({
        workflow_id: workflowId,
        name,
        frequency,
        time,
        cron_expression: useCustomCron ? cronExp : undefined
      });
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Failed to save schedule: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Scheduled Automations</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Configure automated background execution routines that persist across application restarts.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={workflows.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md hover:shadow-purple-500/20 disabled:opacity-50 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Schedule</span>
        </button>
      </div>

      {/* Schedules Table / List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-surface-400">Loading schedules...</div>
      ) : schedules.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-8">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 text-surface-400 mx-auto flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-surface-900 dark:text-white">No schedules configured</div>
          <p className="text-xs text-surface-400 max-w-sm mx-auto">
            Automate workflows to run daily, weekly, or on custom cron patterns in background.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={workflows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Schedule</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedules.map((sch) => (
            <div
              key={sch.id}
              className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-subtle flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-surface-900 dark:text-white">{sch.name}</h3>
                      <span className="text-[10px] text-surface-400 font-mono">
                        {sch.workflow_name || sch.workflow_id}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(sch.id)}
                    className="p-1 rounded text-surface-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 bg-surface-50 dark:bg-surface-800/60 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-400">Cron:</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">
                      {sch.cron_expression}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-400">Frequency:</span>
                    <span className="capitalize text-surface-700 dark:text-surface-300 font-medium">
                      {sch.frequency} at {sch.time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-surface-400">Last Run:</span>
                    <span className="text-surface-700 dark:text-surface-300">
                      {sch.last_run_at ? new Date(sch.last_run_at).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={sch.is_enabled === 1}
                    onChange={() => handleToggle(sch.id, sch.is_enabled)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className={sch.is_enabled === 1 ? 'text-emerald-500' : 'text-surface-400'}>
                    {sch.is_enabled === 1 ? 'Active' : 'Disabled'}
                  </span>
                </label>

                <button
                  onClick={() => handleRunNow(sch.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-600 text-purple-600 dark:text-purple-400 hover:text-white text-xs font-semibold transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Schedule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 p-6 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white">
              <Clock className="w-4 h-4 text-purple-500" />
              <span>Create Automation Schedule</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Target Workflow
                </label>
                <select
                  value={workflowId}
                  onChange={(e) => {
                    setWorkflowId(e.target.value);
                    const wf = workflows.find((w) => w.id === e.target.value);
                    if (wf) setName(`${wf.name} (${frequency})`);
                  }}
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Schedule Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Daily Inventory Check"
                  className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-surface-600 dark:text-surface-400 cursor-pointer flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={useCustomCron}
                    onChange={(e) => setUseCustomCron(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Use custom cron expression</span>
                </label>
              </div>

              {!useCustomCron ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-surface-500 mb-1">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-surface-500 mb-1">Time (UTC)</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] text-surface-500 mb-1">Cron String (5 fields)</label>
                  <input
                    type="text"
                    value={cronExp}
                    onChange={(e) => setCronExp(e.target.value)}
                    placeholder="e.g. */15 * * * *"
                    className="w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-200 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm"
              >
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
