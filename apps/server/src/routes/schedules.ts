import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { generateId } from "@flowpilot/shared";
import { scheduler } from "../scheduler/index.js";
import { scheduleToCron } from "../scheduler/cronUtils.js";
import parser from "cron-parser";
import { runWorkflowExecution } from "../services/executionRunner.js";

const ScheduleSchema = z.object({
  workflowId: z.string(),
  frequency: z.enum(["once", "daily", "weekly", "monthly", "interval", "weekdays", "custom"]),
  time: z.string().default("09:00"),
  timezone: z.string().default("Asia/Kolkata"),
  daysOfWeek: z.array(z.number()).default([]),
  dayOfMonth: z.number().optional(),
  intervalMinutes: z.number().optional(),
  cron: z.string().optional(),
  runOnceAt: z.string().datetime().optional(),
  enabled: z.boolean().default(true),
});

function computeNextRun(schedule: { frequency: string; runOnceAt?: string | Date | null; timezone: string; time: string; daysOfWeek: string | number[]; dayOfMonth?: number | null; intervalMinutes?: number | null; cron?: string | null }): Date | null {
  if (schedule.frequency === "once") {
    return schedule.runOnceAt ? new Date(schedule.runOnceAt) : null;
  }
  const cronExpr = scheduleToCron({
    frequency: schedule.frequency, time: schedule.time,
    daysOfWeek: typeof schedule.daysOfWeek === "string" ? schedule.daysOfWeek : JSON.stringify(schedule.daysOfWeek),
    dayOfMonth: schedule.dayOfMonth ?? null, intervalMinutes: schedule.intervalMinutes ?? null, cron: schedule.cron ?? null,
  } as any);
  if (!cronExpr) return null;
  try {
    return parser.parseExpression(cronExpr, { tz: schedule.timezone || "UTC" }).next().toDate();
  } catch {
    return null;
  }
}

export async function scheduleRoutes(app: FastifyInstance) {
  app.get("/api/schedules", async (req) => {
    const rows = await prisma.schedule.findMany({ where: { workspaceId: req.user!.workspaceId }, include: { workflow: { select: { name: true } } }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => ({
      id: r.id, workflowId: r.workflowId, workflowName: r.workflow.name, frequency: r.frequency, time: r.time,
      timezone: r.timezone, daysOfWeek: JSON.parse(r.daysOfWeek || "[]"), dayOfMonth: r.dayOfMonth,
      intervalMinutes: r.intervalMinutes, cron: r.cron, enabled: r.enabled, nextRunAt: r.nextRunAt,
      lastRunAt: r.lastRunAt, lastRunStatus: r.lastRunStatus,
    }));
  });

  app.post("/api/schedules", async (req, reply) => {
    const body = ScheduleSchema.parse(req.body);
    const workflow = await prisma.workflow.findFirst({ where: { id: body.workflowId, workspaceId: req.user!.workspaceId } });
    if (!workflow) return reply.code(404).send({ error: "Workflow not found." });

    const nextRunAt = computeNextRun({ ...body, daysOfWeek: body.daysOfWeek });
    const row = await prisma.schedule.create({
      data: {
        id: generateId("sched"), workflowId: body.workflowId, workspaceId: req.user!.workspaceId,
        frequency: body.frequency, time: body.time, timezone: body.timezone, daysOfWeek: JSON.stringify(body.daysOfWeek),
        dayOfMonth: body.dayOfMonth, intervalMinutes: body.intervalMinutes, cron: body.cron,
        runOnceAt: body.runOnceAt ? new Date(body.runOnceAt) : null, enabled: body.enabled, nextRunAt,
      },
    });
    if (row.enabled) scheduler.register(row);
    return reply.code(201).send({ id: row.id, nextRunAt: row.nextRunAt });
  });

  app.put("/api/schedules/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.schedule.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Schedule not found." });
    const body = ScheduleSchema.partial().parse(req.body);
    const merged = { ...existing, ...body, daysOfWeek: body.daysOfWeek ? JSON.stringify(body.daysOfWeek) : existing.daysOfWeek };
    const nextRunAt = computeNextRun({ ...merged, daysOfWeek: JSON.parse(merged.daysOfWeek || "[]"), runOnceAt: body.runOnceAt ?? existing.runOnceAt?.toISOString() });
    const row = await prisma.schedule.update({
      where: { id },
      data: {
        frequency: merged.frequency, time: merged.time, timezone: merged.timezone, daysOfWeek: merged.daysOfWeek,
        dayOfMonth: merged.dayOfMonth ?? null, intervalMinutes: merged.intervalMinutes ?? null, cron: merged.cron ?? null,
        runOnceAt: body.runOnceAt ? new Date(body.runOnceAt) : existing.runOnceAt, enabled: merged.enabled, nextRunAt,
      },
    });
    await scheduler.reload(row.id);
    return reply.send({ id: row.id, nextRunAt: row.nextRunAt, enabled: row.enabled });
  });

  app.delete("/api/schedules/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.schedule.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Schedule not found." });
    scheduler.unregister(id);
    await prisma.schedule.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  app.post("/api/schedules/:id/run-now", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.schedule.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Schedule not found." });
    const executionId = await runWorkflowExecution({ workflowId: existing.workflowId, workspaceId: req.user!.workspaceId, triggeredBy: "schedule" });
    await prisma.schedule.update({ where: { id }, data: { lastRunAt: new Date() } });
    return reply.send({ executionId });
  });
}
