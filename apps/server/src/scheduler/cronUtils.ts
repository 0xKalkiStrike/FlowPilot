import type { ScheduleRow } from "../db.js";

/** Converts a Schedule DB row into a standard 5-field cron expression, or
 * null for "once" schedules (handled separately via setTimeout). */
export function scheduleToCron(schedule: Pick<ScheduleRow, "frequency" | "time" | "daysOfWeek" | "dayOfMonth" | "intervalMinutes" | "cron">): string | null {
  const [hh, mm] = (schedule.time || "09:00").split(":").map((n) => parseInt(n, 10));
  const minute = Number.isFinite(mm) ? mm : 0;
  const hour = Number.isFinite(hh) ? hh : 9;

  switch (schedule.frequency) {
    case "once":
      return null;
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekdays":
      return `${minute} ${hour} * * 1-5`;
    case "weekly": {
      const days: number[] = JSON.parse(schedule.daysOfWeek || "[]");
      const dayList = days.length ? days.join(",") : "0";
      return `${minute} ${hour} * * ${dayList}`;
    }
    case "monthly":
      return `${minute} ${hour} ${schedule.dayOfMonth ?? 1} * *`;
    case "interval": {
      const n = Math.min(59, Math.max(1, schedule.intervalMinutes ?? 60));
      return `*/${n} * * * *`;
    }
    case "custom":
      return schedule.cron || null;
    default:
      return null;
  }
}
