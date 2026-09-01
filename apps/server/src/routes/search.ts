import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export async function searchRoutes(app: FastifyInstance) {
  app.get("/api/search", async (req) => {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length === 0) return { workflows: [], templates: [], credentials: [], runs: [] };
    const workspaceId = req.user!.workspaceId;
    const term = q.trim();

    const [workflows, templates, credentials, runs] = await Promise.all([
      prisma.workflow.findMany({ where: { workspaceId, name: { contains: term } }, take: 8 }),
      prisma.template.findMany({ where: { OR: [{ isBuiltIn: true }, { workspaceId }], name: { contains: term } }, take: 8 }),
      prisma.credential.findMany({ where: { workspaceId, name: { contains: term } }, take: 8 }),
      prisma.execution.findMany({ where: { workspaceId }, include: { workflow: true }, take: 50 }),
    ]);

    return {
      workflows: workflows.map((w) => ({ id: w.id, name: w.name })),
      templates: templates.map((t) => ({ id: t.id, name: t.name })),
      credentials: credentials.map((c) => ({ id: c.id, name: c.name })),
      runs: runs.filter((r) => r.workflow.name.toLowerCase().includes(term.toLowerCase())).slice(0, 8).map((r) => ({ id: r.id, workflowName: r.workflow.name, status: r.status })),
    };
  });
}
