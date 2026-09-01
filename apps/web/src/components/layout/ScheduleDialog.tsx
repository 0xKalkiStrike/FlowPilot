import { useState } from "react";
import { Dialog } from "../ui/Dialog.js";
import { Button } from "../ui/Button.js";
import { Input, Label, Select } from "../ui/Input.js";
import { api } from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMEZONES = ["Asia/Kolkata", "UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];

export function ScheduleDialog({ open, onClose, workflowId }: { open: boolean; onClose: () => void; workflowId: string | null }) {
  const [frequency, setFrequency] = useState("daily");
  const [time, setTime] = useState("09:00");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [cron, setCron] = useState("*/15 * * * *");
  const [saving, setSaving] = useState(false);

  function toggleDay(i: number) {
    setDays((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i].sort()));
  }

  async function submit() {
    if (!workflowId) return;
    setSaving(true);
    try {
      const res = await api.post<{ nextRunAt: string }>("/api/schedules", {
        workflowId, frequency, time, timezone, daysOfWeek: days, dayOfMonth, intervalMinutes, cron, enabled: true,
      });
      toast.success("Schedule created", res.nextRunAt ? `Next run: ${new Date(res.nextRunAt).toLocaleString()}` : undefined);
      onClose();
    } catch (err: any) {
      toast.error("Could not create schedule", err.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Schedule Workflow">
      <div className="space-y-4">
        <div>
          <Label>Run</Label>
          <Select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="once">Once</option>
            <option value="daily">Every day</option>
            <option value="weekdays">Every weekday</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Every month</option>
            <option value="interval">On an interval</option>
            <option value="custom">Custom cron</option>
          </Select>
        </div>

        {frequency !== "interval" && frequency !== "custom" && (
          <div>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        )}

        {frequency === "weekly" && (
          <div>
            <Label>Days</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button
                  key={d} type="button" onClick={() => toggleDay(i)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${days.includes(i) ? "bg-brand-500 text-white" : "bg-black/5 dark:bg-white/10"}`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        {frequency === "monthly" && (
          <div>
            <Label>Day of month</Label>
            <Input type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))} />
          </div>
        )}

        {frequency === "interval" && (
          <div>
            <Label>Every N minutes</Label>
            <Input type="number" min={1} max={59} value={intervalMinutes} onChange={(e) => setIntervalMinutes(Number(e.target.value))} />
          </div>
        )}

        {frequency === "custom" && (
          <div>
            <Label>Cron expression</Label>
            <Input value={cron} onChange={(e) => setCron(e.target.value)} placeholder="*/15 * * * *" />
          </div>
        )}

        <div>
          <Label>Timezone</Label>
          <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </Select>
        </div>

        <Button className="w-full" onClick={submit} disabled={saving}>
          {saving ? "Creating..." : "Create Schedule"}
        </Button>
      </div>
    </Dialog>
  );
}
