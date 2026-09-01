import React, { useEffect, useState } from 'react';
import {
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Search,
  Filter,
  Maximize2,
  Terminal,
  Camera,
  X
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { Execution } from '../../types/workflow.js';

export const RunsPage: React.FC = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Execution | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'screenshots'>('logs');

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const filterParam = statusFilter !== 'ALL' ? { status: statusFilter } : undefined;
      const list = await api.getExecutions(filterParam);
      setExecutions(list || []);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
  }, [statusFilter]);

  const handleSelectExecution = async (exec: Execution) => {
    setSelectedExecution(exec);
    setDetailLoading(true);
    try {
      const full = await api.getExecution(exec.id);
      setSelectedDetail(full);
    } catch (err) {
      console.error('Failed to fetch run details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Run History & Executions</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Audit logs, step execution timelines, and screenshot captures for all automated runs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED">Failed Only</option>
            <option value="RUNNING">Running Only</option>
          </select>

          <button
            onClick={loadExecutions}
            className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 transition-colors"
            title="Refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      {loading && executions.length === 0 ? (
        <div className="py-16 text-center text-xs text-surface-400">Loading runs...</div>
      ) : executions.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-8">
          <div className="w-12 h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 text-surface-400 mx-auto flex items-center justify-center">
            <PlayCircle className="w-6 h-6" />
          </div>
          <div className="text-sm font-semibold text-surface-900 dark:text-white">No execution runs found</div>
          <p className="text-xs text-surface-400 max-w-sm mx-auto">
            When you run or schedule workflows, comprehensive step logs and execution timelines will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Workflow</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Started At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800 font-medium">
                {executions.map((exec) => (
                  <tr
                    key={exec.id}
                    onClick={() => handleSelectExecution(exec)}
                    className="hover:bg-surface-50 dark:hover:bg-surface-800/60 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          exec.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : exec.status === 'FAILED'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : exec.status === 'RUNNING'
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 animate-pulse'
                            : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
                        }`}
                      >
                        {exec.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                        {exec.status === 'FAILED' && <AlertCircle className="w-3 h-3" />}
                        {exec.status === 'RUNNING' && <span className="w-2 h-2 rounded-full bg-brand-500"></span>}
                        <span>{exec.status}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-surface-900 dark:text-white">
                        {exec.workflow_name}
                      </div>
                      <div className="text-[10px] text-surface-400 font-mono">{exec.id}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
                        {exec.trigger}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-surface-600 dark:text-surface-300 font-mono">
                      {exec.duration_ms ? `${exec.duration_ms}ms` : '—'}
                    </td>

                    <td className="px-4 py-3 text-surface-500 dark:text-surface-400">
                      {exec.start_time ? new Date(exec.start_time).toLocaleString() : new Date(exec.created_at).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectExecution(exec);
                        }}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Inspect Logs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Inspector Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-surface-900 h-full shadow-2xl border-l border-surface-200 dark:border-surface-800 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-surface-900 dark:text-white">
                  {selectedExecution.workflow_name}
                </h2>
                <span className="text-[11px] text-surface-400 font-mono">
                  {selectedExecution.id} • {selectedExecution.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedExecution(null)}
                className="p-1.5 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 px-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950/40 text-xs font-medium">
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-2.5 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'logs'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                    : 'border-transparent text-surface-500'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Logs ({selectedDetail?.logs?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('screenshots')}
                className={`py-2.5 border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'screenshots'
                    ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                    : 'border-transparent text-surface-500'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Screenshots ({selectedDetail?.screenshots?.length || 0})</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-surface-950 text-surface-100 font-mono text-xs select-text">
              {detailLoading ? (
                <div className="py-8 text-center text-surface-500">Loading full execution logs...</div>
              ) : activeTab === 'logs' ? (
                <div className="space-y-1.5">
                  {!selectedDetail?.logs || selectedDetail.logs.length === 0 ? (
                    <div className="text-surface-500 py-6 text-center">No logs recorded for this run.</div>
                  ) : (
                    selectedDetail.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-[10px] text-surface-500 select-none">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </span>
                        <span
                          className={`break-all ${
                            log.level === 'error'
                              ? 'text-red-400 font-bold'
                              : log.level === 'warn'
                              ? 'text-amber-300'
                              : log.level === 'success'
                              ? 'text-emerald-400 font-semibold'
                              : 'text-surface-300'
                          }`}
                        >
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {!selectedDetail?.screenshots || selectedDetail.screenshots.length === 0 ? (
                    <div className="col-span-2 text-surface-500 py-6 text-center">No screenshots captured.</div>
                  ) : (
                    selectedDetail.screenshots.map((s, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden border border-surface-800 bg-surface-900">
                        <img src={`/screenshots/${s}`} alt="Run Screenshot" className="w-full h-auto object-cover" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
