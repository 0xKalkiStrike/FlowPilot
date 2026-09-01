import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock, ListChecks, PlayCircle, Plus, Video, Upload, LayoutTemplate, XCircle } from "lucide-react";
import { api } from "../lib/api.js";
import { Card, Badge, Spinner } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";

interface Stats {
  totalWorkflows: number; activeWorkflows: number; scheduledWorkflows: number; successfulRuns: number; failedRuns: number;
  recentExecutions: { id: string; workflowName: string; status: string; startedAt: string; durationMs: number | null }[];
  recentWorkflows: { id: string; name: string; updatedAt: string; isActive: boolean }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const navigate = useNavigate();

  useEffect(() => { api.get<Stats>("/api/dashboard/stats").then(setStats); }, []);

  if (!stats) return <div className="flex h-64 items-center justify-center"><Spinner className="h-6 w-6 text-brand-500" /></div>;

  const statCards = [
    { label: "Total Workflows", value: stats.totalWorkflows, icon: ListChecks },
    { label: "Active Workflows", value: stats.activeWorkflows, icon: PlayCircle },
    { label: "Scheduled", value: stats.scheduledWorkflows, icon: Clock },
    { label: "Successful Runs", value: stats.successfulRuns, icon: CheckCircle2 },
    { label: "Failed Runs", value: stats.failedRuns, icon: XCircle },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Build browser automations visually.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4">
            <s.icon size={18} className="mb-2 text-brand-500" />
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-[rgb(var(--text-muted))]">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <QuickAction icon={<Plus size={16} />} label="Create Workflow" onClick={() => navigate("/workflows/new")} />
        <QuickAction icon={<Video size={16} />} label="Record Workflow" onClick={() => navigate("/workflows/new?record=1")} />
        <QuickAction icon={<Upload size={16} />} label="Import Workflow" onClick={() => navigate("/workflows")} />
        <QuickAction icon={<LayoutTemplate size={16} />} label="Browse Templates" onClick={() => navigate("/templates")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Recent Executions</h2>
          {stats.recentExecutions.length === 0 && <p className="text-sm text-[rgb(var(--text-muted))]">No runs yet.</p>}
          <div className="space-y-2">
            {stats.recentExecutions.map((e) => (
              <button key={e.id} onClick={() => navigate(`/runs/${e.id}`)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5">
                <span className="truncate">{e.workflowName}</span>
                <StatusBadge status={e.status} />
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Recent Workflows</h2>
          {stats.recentWorkflows.length === 0 && <p className="text-sm text-[rgb(var(--text-muted))]">No workflows yet.</p>}
          <div className="space-y-2">
            {stats.recentWorkflows.map((w) => (
              <button key={w.id} onClick={() => navigate(`/workflows/${w.id}`)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5">
                <span className="truncate">{w.name}</span>
                <span className="text-xs text-[rgb(var(--text-muted))]">{new Date(w.updatedAt).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick} className="justify-start">
      {icon} {label}
    </Button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = status === "SUCCESS" ? "success" : status === "FAILED" ? "error" : status === "RUNNING" ? "info" : status === "PAUSED" ? "warning" : "default";
  return <Badge variant={variant as any}>{status}</Badge>;
}
