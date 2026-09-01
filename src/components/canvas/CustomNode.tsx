import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { IconRenderer } from '../common/IconRenderer.js';
import { NODE_DEFINITIONS } from '../../lib/nodeDefinitions.js';
import { useExecution } from '../../context/ExecutionContext.js';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Terminal, Code2 } from 'lucide-react';

export const CustomNode = memo(({ id, data, selected }: NodeProps<any>) => {
  const { activeNodeId, completedNodeIds, failedNodeId } = useExecution();

  const nodeType = data?.type || 'trigger_manual';
  const def = NODE_DEFINITIONS[nodeType] || {
    label: data?.label || 'Node',
    icon: 'CircleDot',
    color: '#0ea5e9',
    category: 'CUSTOM'
  };

  const isTrigger = nodeType.startsWith('trigger_');
  const isRunning = activeNodeId === id;
  const isSuccess = completedNodeIds.has(id);
  const isFailed = failedNodeId === id;

  // Determine snippet preview text
  let previewText = data?.description || '';
  if (nodeType === 'code_python') previewText = `🐍 Python → {{${data?.variableName || 'pythonResult'}}}`;
  else if (nodeType === 'code_javascript') previewText = `⚡ JS → {{${data?.variableName || 'jsResult'}}}`;
  else if (nodeType === 'action_cli_command') previewText = `$ ${data?.command || 'cli command'}`;
  else if (nodeType === 'data_http_scrape') previewText = `🌐 ${data?.url || 'https://'}`;
  else if (nodeType === 'data_rss_feed') previewText = `📡 ${data?.url || 'RSS Feed'}`;
  else if (nodeType === 'ai_ollama_local') previewText = `🤖 Ollama (${data?.model || 'llama3'})`;
  else if (nodeType === 'logic_loop') previewText = `🔁 forEach in {{${data?.arrayName || 'items'}}}`;
  else if (nodeType === 'data_file_read') previewText = `📄 Read: ${data?.filePath || 'file'}`;
  else if (nodeType === 'data_file_write') previewText = `💾 Save: ${data?.filePath || 'file'}`;
  else if (data?.url) previewText = data.url;
  else if (data?.text) previewText = `"${data.text}"`;
  else if (data?.selector?.text) previewText = `Target: "${data.selector.text}"`;
  else if (data?.selector?.placeholder) previewText = `Placeholder: "${data.selector.placeholder}"`;
  else if (data?.variableName) previewText = `→ {{${data.variableName}}}`;
  else if (data?.quantity) previewText = `Qty: ${data.quantity} (${data.strategy || 'auto'})`;
  else if (data?.cron) previewText = `Cron: ${data.cron}`;

  return (
    <div
      className={`min-w-[220px] max-w-[280px] bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl rounded-2xl border transition-all duration-200 shadow-elevated ${
        isRunning
          ? 'node-running ring-2 ring-brand-500 shadow-glow-brand'
          : isSuccess
          ? 'node-success border-emerald-500 dark:border-emerald-500/80 ring-2 ring-emerald-500/20'
          : isFailed
          ? 'node-failed border-red-500 dark:border-red-500/80 ring-2 ring-red-500/20'
          : selected
          ? 'border-brand-500 dark:border-brand-400 ring-2 ring-brand-500/30 scale-[1.02]'
          : 'border-surface-200/90 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'
      }`}
    >
      {/* Top accent line */}
      <div
        className="h-1.5 w-full rounded-t-2xl opacity-90 transition-opacity"
        style={{ backgroundColor: def.color || '#0ea5e9' }}
      />

      {/* Input Handle (if not trigger) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-surface-400 dark:!bg-surface-500 hover:!bg-brand-500 !border-2 !border-white dark:!border-surface-900 shadow-sm"
        />
      )}

      {/* Node Header */}
      <div className="p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: def.color || '#0ea5e9' }}
            >
              <IconRenderer name={def.icon} className="w-4 h-4 text-white" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-surface-900 dark:text-white truncate">
                {data?.label || def.label}
              </div>
              <div className="text-[10px] text-surface-400 font-mono truncate">
                {def.category}
              </div>
            </div>
          </div>

          {/* Status icon badge */}
          {isRunning && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 text-[10px] font-bold">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Run</span>
            </div>
          )}
          {isSuccess && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          )}
          {isFailed && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-[10px] font-bold">
              <AlertCircle className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Preview / Description */}
        {previewText && (
          <div className="text-[11px] text-surface-600 dark:text-surface-300 font-mono bg-surface-100/70 dark:bg-surface-950/70 rounded-lg px-2.5 py-1.5 truncate border border-surface-200/50 dark:border-surface-800/80 shadow-2xs">
            {previewText}
          </div>
        )}
      </div>

      {/* Output Handles */}
      {def.hasMultipleOutputs && def.outputHandles ? (
        <div className="flex items-center justify-around border-t border-surface-100 dark:border-surface-800/80 px-2 py-1.5 bg-surface-50/50 dark:bg-surface-950/40 rounded-b-2xl">
          {def.outputHandles.map((handle) => (
            <div key={handle.id} className="relative flex flex-col items-center py-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                {handle.label}
              </span>
              <Handle
                type="source"
                id={handle.id}
                position={Position.Bottom}
                style={{
                  backgroundColor: handle.color || '#0ea5e9',
                  position: 'relative',
                  transform: 'none',
                  left: 'auto',
                  bottom: 'auto',
                  marginTop: '3px'
                }}
                className="!w-3 !h-3 !border-2 !border-white dark:!border-surface-900 shadow-sm"
              />
            </div>
          ))}
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-brand-500 hover:!bg-brand-400 !border-2 !border-white dark:!border-surface-900 shadow-sm"
        />
      )}
    </div>
  );
});
