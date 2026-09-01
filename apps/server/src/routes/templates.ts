import type { FastifyInstance } from "fastify";
import { WorkflowDocumentSchema } from "@flowpilot/workflow-schema";
import { prisma } from "../db.js";
import { generateId } from "@flowpilot/shared";
import { documentToRowData } from "../services/workflowSerializer.js";

export async function templateRoutes(app: FastifyInstance) {
  app.get("/api/templates", async (req) => {
    const rows = await prisma.template.findMany({
      where: { OR: [{ isBuiltIn: true }, { workspaceId: req.user!.workspaceId }] },
      orderBy: [{ isBuiltIn: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => ({ id: r.id, name: r.name, description: r.description, category: r.category, isBuiltIn: r.isBuiltIn }));
  });

  app.get("/api/templates/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.template.findFirst({ where: { id, OR: [{ isBuiltIn: true }, { workspaceId: req.user!.workspaceId }] } });
    if (!row) return reply.code(404).send({ error: "Template not found." });
    return reply.send({ id: row.id, name: row.name, description: row.description, category: row.category, workflow: JSON.parse(row.workflowJson) });
  });

  app.post("/api/templates/:id/use", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.template.findFirst({ where: { id, OR: [{ isBuiltIn: true }, { workspaceId: req.user!.workspaceId }] } });
    if (!row) return reply.code(404).send({ error: "Template not found." });
    const doc = WorkflowDocumentSchema.parse(JSON.parse(row.workflowJson));
    const workflow = await prisma.workflow.create({ data: { id: generateId("wf"), workspaceId: req.user!.workspaceId, ...documentToRowData(doc) } });
    await prisma.workflowVersion.create({ data: { id: generateId("wfv"), workflowId: workflow.id, version: 1, snapshot: JSON.stringify(doc) } });
    return reply.code(201).send({ id: workflow.id, ...doc });
  });
}
