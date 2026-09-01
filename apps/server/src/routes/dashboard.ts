import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { ExecutionStatus } from "@flowpilot/workflow-schema";

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/dashboard/stats", async (req) => {
    const workspaceId = req.user!.workspaceId;
    const [totalWorkflows, activeWorkflows, scheduledWorkflows, successfulRuns, failedRuns, recentExecutions, recentWorkflows] = await Promise.all([
      prisma.workflow.count({ where: { workspaceId } }),
      prisma.workflow.count({ where: { workspaceId, isActive: true } }),
      prisma.schedule.count({ where: { workspaceId, enabled: true } }),
      prisma.execution.count({ where: { workspaceId, status: ExecutionStatus.SUCCESS } }),
      prisma.execution.count({ where: { workspaceId, status: ExecutionStatus.FAILED } }),
      prisma.execution.findMany({ where: { workspaceId }, orderBy: { startedAt: "desc" }, take: 8, include: { workflow: { select: { name: true } } } }),
      prisma.workflow.findMany({ where: { workspaceId }, orderBy: { updatedAt: "desc" }, take: 6 }),
    ]);

    return {
      totalWorkflows, activeWorkflows, scheduledWorkflows, successfulRuns, failedRuns,
      recentExecutions: recentExecutions.map((e) => ({ id: e.id, workflowName: e.workflow.name, status: e.status, startedAt: e.startedAt, durationMs: e.durationMs })),
      recentWorkflows: recentWorkflows.map((w) => ({ id: w.id, name: w.name, updatedAt: w.updatedAt, isActive: w.isActive })),
    };
  });
}
