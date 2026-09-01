import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { DynamicIcon } from "../../lib/icon.js";
import { useNodeRegistryStore } from "../../store/nodeRegistryStore.js";
import { useWorkflowStore } from "../../store/workflowStore.js";
import type { WorkflowNodeData, FlowNodeType } from "../../store/workflowStore.js";

function FlowNodeInner({ id, data, selected }: NodeProps<FlowNodeType>) {
  const def = useNodeRegistryStore((s) => s.byType[data.node.type]);
  const status = useWorkflowStore((s) => s.nodeStatuses[id]);
  const issues = useWorkflowStore((s) => s.validation?.issues.filter((i) => i.nodeId === id) ?? []);
  const hasError = issues.some((i) => i.severity === "error");

  const outputs = def?.outputs ?? [{ id: "out", label: "" }];
  const summary = summarize(data.node);

  return (
    <div
      className={clsx(
        "min-w-[220px] max-w-[260px] rounded-xl border bg-[rgb(var(--bg-elevated))] shadow-sm transition-all",
        selected ? "border-brand-500 ring-2 ring-brand-500/30" : "border-[rgb(var(--border))]",
        status?.status === "started" && "ring-2 ring-brand-400 animate-pulse",
        status?.status === "success" && "border-emerald-500",
        status?.status === "failed" && "border-red-500"
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-[rgb(var(--text-muted))]" />
      <div className="flex items-start gap-2.5 p-3">
        <div className={clsx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", categoryColor(def?.type))}>
          <DynamicIcon name={def?.icon ?? "Box"} size={15} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{data.node.label || def?.label || data.node.type}</p>
          {summary && <p className="mt-0.5 truncate text-xs text-[rgb(var(--text-muted))]">{summary}</p>}
          {data.node.parentId && (
            <p className="mt-1 truncate text-[10px] font-medium text-brand-500">
              ↳ inside {data.node.branch ? `"${data.node.branch}"` : "container"}
            </p>
          )}
        </div>
        <StatusIcon status={status?.status} hasError={hasError} />
      </div>
      {outputs.length > 1 ? (
        <div className="flex border-t border-[rgb(var(--border))] text-[10px] text-[rgb(var(--text-muted))]">
          {outputs.map((o, i) => (
            <div key={o.id} className={clsx("relative flex-1 py-1.5 text-center", i > 0 && "border-l border-[rgb(var(--border))]")}>
              {o.label}
              <Handle type="source" position={Position.Bottom} id={o.id} style={{ left: `${(i + 0.5) * (100 / outputs.length)}%` }} className="!h-2.5 !w-2.5 !bg-[rgb(var(--text-muted))]" />
            </div>
          ))}
        </div>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-[rgb(var(--text-muted))]" />
      )}
    </div>
  );
}

function StatusIcon({ status, hasError }: { status?: string; hasError: boolean }) {
  if (status === "started") return <Loader2 size={16} className="shrink-0 animate-spin text-brand-500" />;
  if (status === "success") return <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />;
  if (status === "failed") return <XCircle size={16} className="shrink-0 text-red-500" />;
  if (hasError) return <AlertTriangle size={16} className="shrink-0 text-amber-500" />;
  return null;
}

function categoryColor(type?: string): string {
  const cat = type?.split(".")[0];
  const map: Record<string, string> = {
    trigger: "bg-violet-500", browser: "bg-sky-500", interaction: "bg-cyan-500", form: "bg-teal-500",
    logic: "bg-amber-500", data: "bg-fuchsia-500", file: "bg-orange-500", service: "bg-indigo-500", utility: "bg-slate-500",
  };
  return map[cat ?? ""] ?? "bg-slate-500";
}

function summarize(node: WorkflowNodeData): string {
  const cfg = node.config as any;
  if (cfg?.url) return cfg.url;
  if (cfg?.value) return String(cfg.value);
  if (cfg?.message) return String(cfg.message);
  if (node.target?.label) return String(node.target.label);
  if (node.target?.text) return String(node.target.text);
  if (node.target?.css) return String(node.target.css);
  return "";
}

export const FlowNode = memo(FlowNodeInner);
