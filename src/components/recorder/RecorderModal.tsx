import React, { useState, useEffect } from 'react';
import { Video, Globe, Square, Check, Loader2, Sparkles, X, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useWorkflow } from '../../context/WorkflowContext.js';

interface RecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

import { wsClient } from '../../lib/wsClient.js';

export interface RecordedActionItem {
  id: string;
  type: string;
  title: string;
  timestamp: number;
}

export const RecorderModal: React.FC<RecorderModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('https://news.ycombinator.com');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [actions, setActions] = useState<RecordedActionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const { setNodes, setEdges } = useWorkflow();

  // Listen to WebSocket recording events via wsClient
  useEffect(() => {
    if (!isOpen || !recordingId) return;

    wsClient.send({
      type: 'SUBSCRIBE_RECORDING',
      payload: { recordingId }
    });

    const unsubscribe = wsClient.subscribe((msg) => {
      if (msg.type === 'RECORDED_ACTION') {
        setActions((prev) => [...prev, msg.payload]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, recordingId]);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    setLoading(true);
    setActions([]);
    try {
      const res = await api.startRecording(url);
      setRecordingId(res.recordingId);
      setIsRecording(true);
    } catch (err: any) {
      alert(`Failed to launch browser recorder: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopRecording = async () => {
    if (!recordingId) return;
    setLoading(true);
    try {
      const result = await api.stopRecording(recordingId);
      if (result.nodes && result.nodes.length > 0) {
        setNodes(result.nodes);
        setEdges(result.edges);
      }
      setIsRecording(false);
      setRecordingId(null);
      onClose();
    } catch (err: any) {
      alert(`Error saving recording: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border border-surface-200 dark:border-surface-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900 dark:text-white flex items-center gap-2">
                <span>Playwright Browser Recorder</span>
                {isRecording && (
                  <span className="flex items-center gap-1 text-[10px] text-red-500 font-semibold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    REC
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-surface-500 dark:text-surface-400">
                Perform actions in the opened browser window — FlowPilot captures clicks, types, and selectors.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRecording}
            className="p-1.5 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!isRecording ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Starting Website URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 text-surface-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full pl-9 pr-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs text-surface-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-brand-500/5 border border-brand-500/20 rounded-xl text-xs text-surface-600 dark:text-surface-300 space-y-1">
                <div className="font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>How browser recording works:</span>
                </div>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-surface-500 dark:text-surface-400">
                  <li>Launches a dedicated Chromium browser window on your screen.</li>
                  <li>Click buttons, fill inputs, check boxes, and select dropdowns normally.</li>
                  <li>FlowPilot detects resilient test-id, role, text, CSS, and XPath selectors.</li>
                  <li>Click "Stop & Finish" to automatically convert the recording into connected visual canvas nodes!</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-surface-700 dark:text-surface-300">
                  Captured User Actions ({actions.length})
                </span>
                <span className="text-surface-400 text-[11px]">Interacting in browser...</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 bg-surface-50 dark:bg-surface-950/60 rounded-xl border border-surface-200 dark:border-surface-800 font-mono text-xs">
                {actions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-surface-400">
                    Interact with the opened browser window to record actions...
                  </div>
                ) : (
                  actions.map((act, i) => (
                    <div
                      key={act.id || i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-surface-900 border border-surface-200/60 dark:border-surface-800/80 shadow-xs"
                    >
                      <span className="text-[10px] text-surface-400 w-5">#{i + 1}</span>
                      <span className="text-brand-600 dark:text-brand-400 font-semibold text-[11px] truncate">
                        {act.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-950/30 flex items-center justify-end gap-2">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={loading || !url}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
              <span>Launch & Start Recording</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Stop & Generate Nodes</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
