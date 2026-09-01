import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Play, Trash2 } from "lucide-react";
import { api } from "../lib/api.js";
import { Card, EmptyState, Badge } from "../components/ui/Card.js";
import { toast } from "../store/toastStore.js";

interface ScheduleSummary {
  id: string; workflowId: string; workflowName: string; frequency: string; time: string; timezone: string;
  enabled: boolean; nextRunAt: string | null; lastRunAt: string | null; lastRunStatus: string | null;
}

export default function Schedules() {
  const [schedules, setSchedules] = useState<ScheduleSummary[] | null>(null);
  const navigate = useNavigate();

  async function load() { setSchedules(await api.get<ScheduleSummary[]>("/api/schedules")); }
  useEffect(() => { load(); }, []);

  async function toggle(s: ScheduleSummary) {
    await api.put(`/api/schedules/${s.id}`, { enabled: !s.enabled });
    load();
  }
  async function runNow(id: string) {
    await api.post(`/api/schedules/${id}/run-now`);
    toast.success("Run started");
  }
  async function remove(id: string) {
    if (!confirm("Delete this schedule?")) return;
    await api.delete(`/api/schedules/${id}`);
    load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedules</h1>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Recurring and one-time triggers. Schedules persist across restarts.</p>
      </div>

      {schedules && schedules.length === 0 && (
        <EmptyState icon={<CalendarClock size={32} />} title="No schedules yet" description="Open a workflow and click Schedule to create one." />
      )}

      {schedules && schedules.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[rgb(var(--border))] bg-black/[0.02] text-left text-xs uppercase text-[rgb(var(--text-muted))] dark:bg-white/[0.02]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Workflow</th>
                <th className="px-4 py-2.5 font-medium">Schedule</th>
                <th className="px-4 py-2.5 font-medium">Next Run</th>
                <th className="px-4 py-2.5 font-medium">Last Run</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-[rgb(var(--border))] last:border-0">
                  <td className="cursor-pointer px-4 py-2.5" onClick={() => navigate(`/workflows/${s.workflowId}`)}>{s.workflowName}</td>
                  <td className="px-4 py-2.5 capitalize text-[rgb(var(--text-muted))]">{s.frequency} {s.time} ({s.timezone})</td>
                  <td className="px-4 py-2.5 text-[rgb(var(--text-muted))]">{s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : "—"}</td>
                  <td className="px-4 py-2.5 text-[rgb(var(--text-muted))]">{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "Never"}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={s.enabled ? "success" : "default"}>{s.enabled ? "Enabled" : "Disabled"}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => toggle(s)} className="rounded-md px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10">{s.enabled ? "Disable" : "Enable"}</button>
                      <button onClick={() => runNow(s.id)} className="rounded-md p-1.5 text-[rgb(var(--text-muted))] hover:bg-black/5 dark:hover:bg-white/10" title="Run now"><Play size={14} /></button>
                      <button onClick={() => remove(s.id)} className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
