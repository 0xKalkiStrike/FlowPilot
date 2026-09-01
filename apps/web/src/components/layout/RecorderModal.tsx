import { useEffect, useRef, useState } from "react";
import { Circle, Pause, Play, Square, Undo2 } from "lucide-react";
import { Dialog } from "../ui/Dialog.js";
import { Button } from "../ui/Button.js";
import { Input, Label } from "../ui/Input.js";
import { api } from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useWorkflowStore } from "../../store/workflowStore.js";
import { generateClientId } from "../../lib/id.js";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RecorderModal({ open, onClose }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startUrl, setStartUrl] = useState("https://example.com");
  const [status, setStatus] = useState<{ currentUrl: string; lastAction: string; eventCount: number; paused: boolean } | null>(null);
  const [launching, setLaunching] = useState(false);
  const pollRef = useRef<number | null>(null);
  const { nodes, setNodes, setEdges } = useWorkflowStore();

  useEffect(() => {
    if (!sessionId) return;
    pollRef.current = window.setInterval(async () => {
      try {
        const s = await api.get<any>(`/api/recorder/${sessionId}/status`);
        setStatus(s);
      } catch { /* session may have just been stopped */ }
    }, 1200);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId]);

  async function start() {
    setLaunching(true);
    try {
      const res = await api.post<{ sessionId: string }>("/api/recorder/start", { startUrl: startUrl || undefined });
      setSessionId(res.sessionId);
    } catch (err: any) {
      toast.error("Could not launch recorder", err.message ?? String(err));
    } finally {
      setLaunching(false);
    }
  }

  async function stopAndImport() {
    if (!sessionId) return;
    try {
      const result = await api.post<{ nodes: any[]; edges: any[] }>(`/api/recorder/${sessionId}/stop`);
      mergeIntoCanvas(result);
      toast.success(`Recorded ${result.nodes.length} step(s)`, "Review and save the workflow.");
      cleanup();
    } catch (err: any) {
      toast.error("Failed to stop recorder", err.message ?? String(err));
    }
  }

  function mergeIntoCanvas(result: { nodes: any[]; edges: any[] }) {
    const idMap = new Map<string, string>();
    const offsetY = nodes.length ? Math.max(...nodes.map((n) => n.position.y)) + 160 : 80;
    const newRfNodes = result.nodes.map((n) => {
      const newId = generateClientId("node");
      idMap.set(n.id, newId);
      return { id: newId, type: "flowNode", position: { x: n.position.x, y: n.position.y + offsetY }, data: { node: { ...n, id: newId } } };
    });
    const newRfEdges = result.edges.map((e) => ({ id: generateClientId("edge"), source: idMap.get(e.source)!, target: idMap.get(e.target)! }));
    const bridgeEdge = nodes.length > 0 && newRfNodes.length > 0
      ? [{ id: generateClientId("edge"), source: nodes[nodes.length - 1].id, target: newRfNodes[0].id }]
      : [];
    setNodes([...nodes, ...newRfNodes] as any);
    setEdges([...useWorkflowStore.getState().edges, ...newRfEdges, ...bridgeEdge]);
  }

  function cleanup() {
    if (pollRef.current) clearInterval(pollRef.current);
    setSessionId(null);
    setStatus(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={cleanup} title="Record Workflow" widthClass="max-w-xl">
      {!sessionId ? (
        <div className="space-y-4">
          <p className="text-sm text-[rgb(var(--text-muted))]">
            FlowPilot will open a real, controlled browser window. Perform the actions you want to automate — clicks, typing,
            selections — and they'll be converted into workflow nodes automatically. Password values are never recorded.
          </p>
          <div>
            <Label>Starting URL (optional)</Label>
            <Input value={startUrl} onChange={(e) => setStartUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <Button onClick={start} disabled={launching} className="w-full">
            <Circle size={14} className="fill-current" /> {launching ? "Launching browser..." : "Start Recording"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-[rgb(var(--border))] p-3 text-sm">
            <p className="truncate"><span className="text-[rgb(var(--text-muted))]">Current URL: </span>{status?.currentUrl}</p>
            <p className="mt-1 truncate"><span className="text-[rgb(var(--text-muted))]">Last action: </span>{status?.lastAction}</p>
            <p className="mt-1"><span className="text-[rgb(var(--text-muted))]">Steps captured: </span>{status?.eventCount ?? 0}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary" size="sm"
              onClick={() => api.post(`/api/recorder/${sessionId}/${status?.paused ? "resume" : "pause"}`)}
            >
              {status?.paused ? <Play size={14} /> : <Pause size={14} />} {status?.paused ? "Resume" : "Pause"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => api.post(`/api/recorder/${sessionId}/undo`)}>
              <Undo2 size={14} /> Undo last
            </Button>
            <Button variant="danger" size="sm" onClick={stopAndImport}>
              <Square size={14} /> Stop & Import
            </Button>
          </div>
          <p className="text-xs text-[rgb(var(--text-muted))]">
            Switch to the opened browser window to perform actions. This panel updates automatically.
          </p>
        </div>
      )}
    </Dialog>
  );
}
