import { useRef } from "react";
import { Play, Save, Video, CalendarClock, Upload, Download, FlaskConical, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/Button.js";
import { useWorkflowStore } from "../../store/workflowStore.js";
import { api } from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";

export function BottomBar({
  onRecord, onSchedule, onRunStart,
}: { onRecord: () => void; onSchedule: () => void; onRunStart: (executionId: string) => void }) {
  const { id, name, dirty, saving, save, selectedNodeId, toDocument, loadFromDocument, activeExecutionId } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    try { await save(); toast.success("Workflow saved"); } catch (err: any) { toast.error("Save failed", err.message); }
  }

  async function handleRun() {
    if (!id) return;
    try {
      await save();
      const res = await api.post<{ executionId: string }>(`/api/workflows/${id}/run`);
      onRunStart(res.executionId);
    } catch (err: any) {
      toast.error("Could not start run", err.message ?? String(err));
    }
  }

  async function handleTestStep() {
    if (!id || !selectedNodeId) { toast.info("Select a node first", "Click a node on the canvas, then Test Step."); return; }
    try {
      const res = await api.post<{ executionId: string }>(`/api/workflows/${id}/test-step`, { nodeId: selectedNodeId, document: toDocument() });
      onRunStart(res.executionId);
    } catch (err: any) {
      toast.error("Test step failed", err.message ?? String(err));
    }
  }

  function handleExport() {
    const doc = toDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "workflow").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      loadFromDocument({ ...parsed, id }, id);
      toast.success("Workflow imported", "Review the canvas, then Save to persist it.");
    } catch (err: any) {
      toast.error("Import failed", err.message ?? "Invalid workflow JSON.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-t border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </Button>
        <Button size="sm" onClick={handleRun}>
          <Play size={14} /> Run
        </Button>
        <Button variant="secondary" size="sm" onClick={handleTestStep}>
          <FlaskConical size={14} /> Test Step
        </Button>
        <Button variant="secondary" size="sm" onClick={onRecord}>
          <Video size={14} /> Record
        </Button>
        <Button variant="secondary" size="sm" onClick={onSchedule}>
          <CalendarClock size={14} /> Schedule
        </Button>
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> Import
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
        <Button variant="secondary" size="sm" onClick={handleExport}>
          <Download size={14} /> Export
        </Button>
      </div>
      <div className="flex items-center gap-3 text-xs text-[rgb(var(--text-muted))]">
        {dirty && <span className="text-amber-500">Unsaved changes</span>}
        {activeExecutionId && <RunStatusChip />}
      </div>
    </div>
  );
}

function RunStatusChip() {
  const status = useWorkflowStore((s) => Object.values(s.nodeStatuses).some((n) => n.status === "started"));
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 font-medium text-brand-600 dark:text-brand-400">
      {status ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
      {status ? "Running" : "Finished"}
    </span>
  );
}
