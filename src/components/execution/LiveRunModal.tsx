import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Camera,
  RotateCw,
  Pause,
  Maximize2
} from 'lucide-react';
import { useExecution } from '../../context/ExecutionContext.js';

export const LiveRunModal: React.FC = () => {
  const {
    isModalOpen,
    closeModal,
    activeExecutionId,
    status,
    logs,
    screenshots,
    cancelActiveExecution
  } = useExecution();

  const [activeTab, setActiveTab] = useState<'logs' | 'screenshots'>('logs');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom on new log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isModalOpen || !activeExecutionId) return null;

  const isRunning = status === 'RUNNING';
  const isSuccess = status === 'SUCCESS';
  const isFailed = status === 'FAILED';
  const isPaused = status === 'PAUSED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isRunning
                    ? 'bg-brand-500 animate-ping'
                    : isSuccess
                    ? 'bg-emerald-500'
                    : isFailed
                    ? 'bg-red-500'
                    : isPaused
                    ? 'bg-amber-500'
                    : 'bg-surface-400'
                }`}
              />
              <span className="text-sm font-bold text-surface-900 dark:text-white">
                Live Automation Execution
              </span>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isRunning
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : isSuccess
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : isFailed
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
              }`}
            >
              {status}
            </span>
            <span className="text-xs font-mono text-surface-400">ID: {activeExecutionId}</span>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <button
                onClick={cancelActiveExecution}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel Run
              </button>
            )}
            <button
              onClick={closeModal}
              className="p-1.5 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-4 px-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-950/30 text-xs font-medium">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 py-2.5 border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Execution Terminal Logs ({logs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('screenshots')}
            className={`flex items-center gap-1.5 py-2.5 border-b-2 transition-colors ${
              activeTab === 'screenshots'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-semibold'
                : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Screenshots ({screenshots.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-surface-950 text-surface-100 font-mono text-xs select-text">
          {activeTab === 'logs' ? (
            <div className="space-y-1.5">
              {logs.length === 0 ? (
                <div className="text-surface-500 py-6 text-center">
                  Initializing Playwright browser and preparing execution context...
                </div>
              ) : (
                logs.map((log, idx) => (
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
              <div ref={logEndRef} />
            </div>
          ) : (
            <div>
              {screenshots.length === 0 ? (
                <div className="text-surface-500 py-10 text-center">
                  No screenshots captured yet during this run.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {screenshots.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedScreenshot(`/screenshots/${s}`)}
                      className="group relative rounded-xl overflow-hidden border border-surface-800 bg-surface-900 cursor-pointer aspect-video hover:border-brand-500 transition-all"
                    >
                      <img
                        src={`/screenshots/${s}`}
                        alt="Captured run step"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-900/80 flex items-center justify-between text-xs text-surface-500">
          <div className="flex items-center gap-2">
            <span>Playwright Engine</span>
            <span>•</span>
            <span>Logs streamed via WebSocket</span>
          </div>
          <button
            onClick={closeModal}
            className="px-3 py-1.5 rounded-lg bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lightbox for Zoomed Screenshot */}
      {selectedScreenshot && (
        <div
          onClick={() => setSelectedScreenshot(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={selectedScreenshot} alt="Zoomed Screenshot" className="rounded-xl max-h-[85vh] object-contain shadow-2xl" />
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
