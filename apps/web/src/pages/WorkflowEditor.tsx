import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { ArrowLeft } from "lucide-react";
import { useWorkflowStore } from "../store/workflowStore.js";
import { useNodeRegistryStore } from "../store/nodeRegistryStore.js";
import { NodePalette } from "../components/layout/NodePalette.js";
import { ConfigPanel } from "../components/layout/ConfigPanel.js";
import { BottomBar } from "../components/layout/BottomBar.js";
import { WorkflowCanvas } from "../components/canvas/WorkflowCanvas.js";
import { RecorderModal } from "../components/layout/RecorderModal.js";
import { ScheduleDialog } from "../components/layout/ScheduleDialog.js";
import { ExecutionLogPanel, type LogEntry } from "../components/layout/ExecutionLogPanel.js";
import { useExecutionStream } from "../hooks/useExecutionStream.js";
import { Input } from "../components/ui/Input.js";
import { Spinner } from "../components/ui/Card.js";

export default function WorkflowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const store = useWorkflowStore();
  const loadRegistry = useNodeRegistryStore((s) => s.load);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [execStatus, setExecStatus] = useState<string | null>(null);

  useEffect(() => {
    loadRegistry();
    store.reset();
    if (id && id !== "new") {
      store.loadWorkflow(id);
    } else {
      store.createWorkflow("Untitled Workflow", "").then((newId) => {
        navigate(`/workflows/${newId}`, { replace: true });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useExecutionStream(store.activeExecutionId, {
    onLog: (p) => setLogs((prev) => [...prev, p]),
    onStatus: (p) => setExecStatus(p.status),
    onNodeStatus: (p) => store.setNodeStatus(p.nodeId, { status: p.status, error: p.error }),
    onDone: (p) => setExecStatus(p.status),
  });

  function handleRunStart(executionId: string) {
    store.clearNodeStatuses();
    setLogs([]);
    setExecStatus("RUNNING");
    store.setActiveExecutionId(executionId);
    setShowLogs(true);
  }

  useEffect(() => {
    if (store.loaded && searchParams.get("record") === "1") {
      setRecorderOpen(true);
      searchParams.delete("record");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.loaded]);

  if (!store.loaded) {
    return <div className="flex h-full items-center justify-center"><Spinner className="h-6 w-6 text-brand-500" /></div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4">
        <button onClick={() => navigate("/workflows")} className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-black/5 dark:hover:bg-white/5">
          <ArrowLeft size={16} />
        </button>
        <Input value={store.name} onChange={(e) => store.setName(e.target.value)} className="h-8 max-w-xs border-none bg-transparent px-1 text-sm font-semibold focus-visible:ring-1" />
        <span className="text-xs text-[rgb(var(--text-muted))]">{store.trigger.type === "schedule" ? "Scheduled" : "Manual trigger"}</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <NodePalette />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <ReactFlowProvider>
              <WorkflowCanvas />
            </ReactFlowProvider>
          </div>
          {showLogs && <ExecutionLogPanel logs={logs} status={execStatus} onClose={() => setShowLogs(false)} />}
          <BottomBar onRecord={() => setRecorderOpen(true)} onSchedule={() => setScheduleOpen(true)} onRunStart={handleRunStart} />
        </div>
        <ConfigPanel />
      </div>
      <RecorderModal open={recorderOpen} onClose={() => setRecorderOpen(false)} />
      <ScheduleDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} workflowId={store.id} />
    </div>
  );
}
