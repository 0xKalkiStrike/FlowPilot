import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Download, Loader2, XCircle } from "lucide-react";
import { api } from "../lib/api.js";
import { Card, Spinner } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { StatusBadge } from "./Dashboard.js";
import { useExecutionStream } from "../hooks/useExecutionStream.js";

interface RunData {
  id: string; workflowId: string; workflowName: string; status: string; triggeredBy: string;
  startedAt: string; finishedAt: string | null; durationMs: number | null; error: string | null; currentNodeId: string | null;
  variables: Record<string, unknown>;
  logs: { id: string; nodeId?: string; nodeLabel?: string; level: string; message: string; status?: string; timestamp: string }[];
  files: { id: string; kind: string; fileName: string; sizeBytes: number; createdAt: string }[];
}

export default function RunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState<RunData | null>(null);

  async function load() {
    if (!id) return;
    setRun(await api.get<RunData>(`/api/executions/${id}`));
  }
  useEffect(() => { load(); }, [id]);

  useExecutionStream(run && !run.finishedAt ? run.id : null, {
    onLog: (p) => setRun((r) => (r ? { ...r, logs: [...r.logs, p] } : r)),
    onNodeStatus: (p) =>
      setRun((r) =>
        r
          ? {
              ...r,
              currentNodeId: p.nodeId,
              logs: [
                ...r.logs,
                {
                  id: `live_${p.nodeId}_${p.status}_${Date.now()}`,
                  nodeId: p.nodeId, nodeLabel: p.label, status: p.status,
                  level: p.status === "failed" ? "error" : "info",
                  message: p.status === "failed" ? `Failed: ${p.error ?? "unknown error"}` : `${p.label ?? p.nodeId} — ${p.status}`,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : r
      ),
    onStatus: (p) => setRun((r) => (r ? { ...r, status: p.status } : r)),
    onDone: () => load(),
  });

  async function cancel() {
    if (!id) return;
    await api.post(`/api/executions/${id}/cancel`);
    load();
  }

  if (!run) return <div className="flex h-64 items-center justify-center"><Spinner className="h-6 w-6 text-brand-500" /></div>;

  const nodeSteps = dedupeLatestByNode(run.logs);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <button onClick={() => navigate("/runs")} className="flex items-center gap-1.5 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]">
        <ArrowLeft size={14} /> Back to Runs
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{run.workflowName}</h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-[rgb(var(--text-muted))]">
            <StatusBadge status={run.status} />
            <span>Started {new Date(run.startedAt).toLocaleString()}</span>
            {run.durationMs && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
          </div>
        </div>
        {run.status === "RUNNING" && <Button variant="danger" size="sm" onClick={cancel}>Cancel</Button>}
      </div>

      {run.error && (
        <Card className="border-red-500/40 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">{run.error}</Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
          <div className="space-y-2">
            {nodeSteps.map((step) => (
              <div key={step.nodeId} className="flex items-center gap-2.5 text-sm">
                <StepIcon status={step.status} />
                <span className="flex-1 truncate">{step.nodeLabel}</span>
                <span className="text-xs text-[rgb(var(--text-muted))]">{new Date(step.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
            {nodeSteps.length === 0 && <p className="text-sm text-[rgb(var(--text-muted))]">No steps recorded.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Files</h2>
          {run.files.length === 0 && <p className="text-sm text-[rgb(var(--text-muted))]">No files produced.</p>}
          <div className="space-y-2">
            {run.files.map((f) => (
              <a key={f.id} href={`/api/files/${f.id}/download`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5">
                <span className="truncate">{f.fileName}</span>
                <Download size={14} className="text-[rgb(var(--text-muted))]" />
              </a>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Logs</h2>
        <div className="max-h-96 space-y-1 overflow-y-auto font-mono text-xs">
          {run.logs.map((l) => (
            <div key={l.id} className="flex gap-2">
              <span className="shrink-0 text-[rgb(var(--text-muted))]">{new Date(l.timestamp).toLocaleTimeString()}</span>
              <span className={`shrink-0 font-semibold ${l.level === "error" ? "text-red-500" : l.level === "warn" ? "text-amber-500" : "text-brand-500"}`}>[{l.level}]</span>
              {l.nodeLabel && <span className="shrink-0 text-[rgb(var(--text-muted))]">{l.nodeLabel}:</span>}
              <span className="break-all">{l.message}</span>
            </div>
          ))}
        </div>
      </Card>

      {Object.keys(run.variables).length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Final Variables</h2>
          <pre className="overflow-x-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/5">{JSON.stringify(run.variables, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}

function StepIcon({ status }: { status?: string }) {
  if (status === "started") return <Loader2 size={15} className="animate-spin text-brand-500" />;
  if (status === "success") return <CheckCircle2 size={15} className="text-emerald-500" />;
  if (status === "failed") return <XCircle size={15} className="text-red-500" />;
  return <CheckCircle2 size={15} className="text-[rgb(var(--text-muted))]" />;
}

function dedupeLatestByNode(logs: RunData["logs"]) {
  const map = new Map<string, RunData["logs"][number]>();
  for (const l of logs) {
    if (!l.nodeId || !l.status) continue;
    map.set(l.nodeId, l);
  }
  return [...map.values()];
}
