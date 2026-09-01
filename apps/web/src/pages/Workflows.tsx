import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Plus, Trash2, Upload, Video, Workflow as WorkflowIcon, Zap } from "lucide-react";
import { api } from "../lib/api.js";
import { Card, EmptyState, Badge } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { toast } from "../store/toastStore.js";

interface WorkflowSummary { id: string; name: string; description: string; isActive: boolean; triggerType: string; nodeCount: number; updatedAt: string }

export default function Workflows() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[] | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setWorkflows(await api.get<WorkflowSummary[]>("/api/workflows"));
  }
  useEffect(() => { load(); }, []);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const doc = JSON.parse(text);
      const res = await api.post<{ id: string }>("/api/workflows/import", doc);
      toast.success("Workflow imported");
      navigate(`/workflows/${res.id}`);
    } catch (err: any) {
      toast.error("Import failed", err.message ?? "Invalid workflow JSON.");
    } finally {
      e.target.value = "";
    }
  }

  async function duplicate(id: string) {
    await api.post(`/api/workflows/${id}/duplicate`);
    toast.success("Workflow duplicated");
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this workflow? This cannot be undone.")) return;
    await api.delete(`/api/workflows/${id}`);
    toast.success("Workflow deleted");
    load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflows</h1>
          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Everything you've built or recorded.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Import</Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          <Button onClick={() => navigate("/workflows/new")}><Plus size={15} /> Create Workflow</Button>
        </div>
      </div>

      {workflows && workflows.length === 0 && (
        <EmptyState
          icon={<WorkflowIcon size={32} />}
          title="No workflows yet"
          description="Create your first automation or record one from your browser."
          action={<>
            <Button onClick={() => navigate("/workflows/new")}><Plus size={15} /> Create Workflow</Button>
            <Button variant="secondary" onClick={() => navigate("/workflows/new?record=1")}><Video size={15} /> Record Workflow</Button>
          </>}
        />
      )}

      {workflows && workflows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((w) => (
            <Card key={w.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between">
                <button onClick={() => navigate(`/workflows/${w.id}`)} className="min-w-0 text-left">
                  <p className="truncate font-medium">{w.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[rgb(var(--text-muted))]">{w.description || "No description"}</p>
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={w.isActive ? "success" : "default"}>{w.isActive ? "Active" : "Inactive"}</Badge>
                {w.triggerType === "schedule" && <Badge variant="info"><Zap size={10} className="mr-1 inline" />Scheduled</Badge>}
                <span className="text-xs text-[rgb(var(--text-muted))]">{w.nodeCount} nodes</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[rgb(var(--border))] pt-3">
                <span className="text-xs text-[rgb(var(--text-muted))]">Updated {new Date(w.updatedAt).toLocaleDateString()}</span>
                <div className="flex gap-1">
                  <button onClick={() => duplicate(w.id)} className="rounded-md p-1.5 text-[rgb(var(--text-muted))] hover:bg-black/5 dark:hover:bg-white/10" title="Duplicate"><Copy size={14} /></button>
                  <button onClick={() => remove(w.id)} className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
