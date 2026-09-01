import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import { api } from "../lib/api.js";
import { Card, EmptyState } from "../components/ui/Card.js";
import { StatusBadge } from "./Dashboard.js";

interface ExecutionSummary { id: string; workflowId: string; workflowName: string; status: string; triggeredBy: string; startedAt: string; durationMs: number | null }

export default function Runs() {
  const [executions, setExecutions] = useState<ExecutionSummary[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => { api.get<ExecutionSummary[]>("/api/executions").then(setExecutions); }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Runs</h1>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Every execution, manual and scheduled.</p>
      </div>

      {executions && executions.length === 0 && (
        <EmptyState icon={<History size={32} />} title="No runs yet" description="Run a workflow to see its execution history here." />
      )}

      {executions && executions.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[rgb(var(--border))] bg-black/[0.02] text-left text-xs uppercase text-[rgb(var(--text-muted))] dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Workflow</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Trigger</th>
                <th className="px-4 py-2.5 font-medium">Started</th>
                <th className="px-4 py-2.5 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((e) => (
                <tr key={e.id} onClick={() => navigate(`/runs/${e.id}`)} className="cursor-pointer border-b border-[rgb(var(--border))] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="px-4 py-2.5">{e.workflowName}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-2.5 capitalize text-[rgb(var(--text-muted))]">{e.triggeredBy}</td>
                  <td className="px-4 py-2.5 text-[rgb(var(--text-muted))]">{new Date(e.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-[rgb(var(--text-muted))]">{e.durationMs ? `${(e.durationMs / 1000).toFixed(1)}s` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
