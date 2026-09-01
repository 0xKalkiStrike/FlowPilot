import clsx from "clsx";
import { CheckCircle2, ChevronDown, Loader2, X, XCircle } from "lucide-react";
import { useState } from "react";

export interface LogEntry {
  id: string; nodeId?: string; nodeLabel?: string; level: string; message: string; timestamp: string;
}

export function ExecutionLogPanel({ logs, status, onClose }: { logs: LogEntry[]; status: string | null; onClose: () => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={clsx("flex shrink-0 flex-col border-t border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] transition-all", collapsed ? "h-10" : "h-64")}>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[rgb(var(--border))] px-4">
        <button onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-1.5 text-sm font-medium">
          <ChevronDown size={14} className={clsx("transition-transform", collapsed && "-rotate-90")} />
          Execution logs
          {status && <StatusBadge status={status} />}
        </button>
        <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"><X size={14} /></button>
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs">
          {logs.length === 0 && <p className="text-[rgb(var(--text-muted))]">Waiting for events...</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex gap-2 py-0.5">
              <span className="shrink-0 text-[rgb(var(--text-muted))]">{new Date(l.timestamp).toLocaleTimeString()}</span>
              <span className={clsx("shrink-0 font-semibold", l.level === "error" && "text-red-500", l.level === "warn" && "text-amber-500", l.level === "info" && "text-brand-500")}>
                [{l.level}]
              </span>
              {l.nodeLabel && <span className="shrink-0 text-[rgb(var(--text-muted))]">{l.nodeLabel}:</span>}
              <span className="break-all">{l.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "RUNNING") return <span className="flex items-center gap-1 text-xs font-normal text-brand-500"><Loader2 size={11} className="animate-spin" />Running</span>;
  if (status === "SUCCESS") return <span className="flex items-center gap-1 text-xs font-normal text-emerald-500"><CheckCircle2 size={11} />Success</span>;
  if (status === "FAILED") return <span className="flex items-center gap-1 text-xs font-normal text-red-500"><XCircle size={11} />Failed</span>;
  return <span className="text-xs font-normal text-[rgb(var(--text-muted))]">{status}</span>;
}
