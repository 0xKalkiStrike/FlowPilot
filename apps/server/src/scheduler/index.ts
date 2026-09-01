import cron, { type ScheduledTask } from "node-cron";
import parser from "cron-parser";
import type { ScheduleRow } from "../db.js";
import { prisma } from "../db.js";
import { ExecutionStatus } from "@flowpilot/workflow-schema";
import { runWorkflowExecution } from "../services/executionRunner.js";
import { scheduleToCron } from "./cronUtils.js";

/**
 * In-process scheduler (BullMQ/Redis fallback per spec section 33). Schedules
 * are persisted in the `schedules` table and reloaded on every server start,
 * so restarting the application never loses a schedule.
 */
class SchedulerService {
  private tasks = new Map<string, ScheduledTask>();
  private onceTimers = new Map<string, NodeJS.Timeout>();

  async loadAll() {
    const schedules = await prisma.schedule.findMany({ where: { enabled: true } });
    for (const s of schedules) this.register(s);
    console.log(`[scheduler] loaded ${schedules.length} active schedule(s)`);
  }

  register(schedule: ScheduleRow) {
    this.unregister(schedule.id);
    if (schedule.frequency === "once") {
      const at = schedule.runOnceAt ?? schedule.nextRunAt;
      if (!at) return;
      const delay = at.getTime() - Date.now();
      if (delay <= 0) return;
      const timer = setTimeout(() => this.fire(schedule.id), Math.min(delay, 2_147_483_000));
      this.onceTimers.set(schedule.id, timer);
      return;
    }
    const cronExpr = scheduleToCron(schedule);
    if (!cronExpr || !cron.validate(cronExpr)) {
      console.warn(`[scheduler] invalid cron for schedule ${schedule.id}: ${cronExpr}`);
      return;
    }
    const task = cron.schedule(cronExpr, () => this.fire(schedule.id), { timezone: schedule.timezone || "UTC" });
    this.tasks.set(schedule.id, task);
    void this.updateNextRun(schedule.id, cronExpr, schedule.timezone);
  }

  unregister(scheduleId: string) {
    this.tasks.get(scheduleId)?.stop();
    this.tasks.delete(scheduleId);
    const t = this.onceTimers.get(scheduleId);
    if (t) { clearTimeout(t); this.onceTimers.delete(scheduleId); }
  }

  async reload(scheduleId: string) {
    const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule || !schedule.enabled) { this.unregister(scheduleId); return; }
    this.register(schedule);
  }

  private async updateNextRun(scheduleId: string, cronExpr: string, timezone: string) {
    try {
      const interval = parser.parseExpression(cronExpr, { tz: timezone || "UTC" });
      const next = interval.next().toDate();
      await prisma.schedule.update({ where: { id: scheduleId }, data: { nextRunAt: next } });
    } catch (err) {
      console.warn(`[scheduler] failed to compute next run for ${scheduleId}`, err);
    }
  }

  private async fire(scheduleId: string) {
    const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule || !schedule.enabled) return;
    console.log(`[scheduler] firing schedule ${scheduleId} for workflow ${schedule.workflowId}`);
    try {
      const executionId = await runWorkflowExecution({
        workflowId: schedule.workflowId,
        workspaceId: schedule.workspaceId,
        triggeredBy: "schedule",
      });
      await prisma.schedule.update({ where: { id: scheduleId }, data: { lastRunAt: new Date(), lastRunStatus: ExecutionStatus.RUNNING } });
      void this.waitAndRecordResult(scheduleId, executionId);
    } catch (err) {
      await prisma.schedule.update({ where: { id: scheduleId }, data: { lastRunAt: new Date(), lastRunStatus: ExecutionStatus.FAILED } });
    }
    if (schedule.frequency === "once") {
      await prisma.schedule.update({ where: { id: scheduleId }, data: { enabled: false } });
      this.unregister(scheduleId);
    } else {
      const cronExpr = scheduleToCron(schedule);
      if (cronExpr) await this.updateNextRun(scheduleId, cronExpr, schedule.timezone);
    }
  }

  private async waitAndRecordResult(scheduleId: string, executionId: string) {
    for (let i = 0; i < 600; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const exec = await prisma.execution.findUnique({ where: { id: executionId } });
      if (exec && exec.finishedAt) {
        await prisma.schedule.update({ where: { id: scheduleId }, data: { lastRunStatus: exec.status } });
        return;
      }
    }
  }
}

export const scheduler = new SchedulerService();
