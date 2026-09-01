import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  WorkflowDocumentSchema, validateWorkflowStructure, getNodeDefinition,
  WORKFLOW_SCHEMA_VERSION, type WorkflowDocument,
} from "@flowpilot/workflow-schema";
import { prisma } from "../db.js";
import { generateId } from "@flowpilot/shared";
import { rowToDocument, documentToRowData } from "../services/workflowSerializer.js";
import { runWorkflowExecution } from "../services/executionRunner.js";

const CreateWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

/** Semantic validation beyond structure: unknown node types, missing required config. */
function validateNodeConfigs(doc: WorkflowDocument) {
  const issues: { nodeId: string; message: string; severity: "error" | "warning" }[] = [];
  for (const node of doc.nodes) {
    const def = getNodeDefinition(node.type);
    if (!def) {
      issues.push({ nodeId: node.id, message: `Unknown node type "${node.type}".`, severity: "error" });
      continue;
    }
    if (!def.implemented) {
      issues.push({ nodeId: node.id, message: `"${def.label}" is not yet supported for execution.`, severity: "error" });
    }
    if (def.requiresTarget && !node.target) {
      issues.push({ nodeId: node.id, message: `"${node.label ?? def.label}" requires a target element.`, severity: "error" });
    }
    const parsed = def.configSchema.safeParse(node.config ?? {});
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({ nodeId: node.id, message: `${def.label}: ${issue.path.join(".")} — ${issue.message}`, severity: "error" });
      }
    }
    if (node.type === "browser.open" && !(node.config as any)?.url) {
      issues.push({ nodeId: node.id, message: "URL is required.", severity: "error" });
    }
  }
  return issues;
}

export async function workflowRoutes(app: FastifyInstance) {
  app.get("/api/workflows", async (req) => {
    const rows = await prisma.workflow.findMany({ where: { workspaceId: req.user!.workspaceId }, orderBy: { updatedAt: "desc" } });
    return rows.map((r) => ({
      id: r.id, name: r.name, description: r.description, isActive: r.isActive,
      triggerType: r.triggerType, nodeCount: JSON.parse(r.nodes || "[]").length,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    }));
  });

  app.post("/api/workflows", async (req, reply) => {
    const body = CreateWorkflowSchema.parse(req.body);
    const doc = WorkflowDocumentSchema.parse({
      schemaVersion: WORKFLOW_SCHEMA_VERSION, name: body.name, description: body.description ?? "",
      trigger: { type: "manual", config: {} }, nodes: [], edges: [],
    });
    const row = await prisma.workflow.create({
      data: { id: generateId("wf"), workspaceId: req.user!.workspaceId, ...documentToRowData(doc) },
    });
    await prisma.workflowVersion.create({ data: { id: generateId("wfv"), workflowId: row.id, version: 1, snapshot: JSON.stringify(doc) } });
    return reply.code(201).send({ id: row.id, ...doc });
  });

  app.get("/api/workflows/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!row) return reply.code(404).send({ error: "Workflow not found." });
    return { id: row.id, ...rowToDocument(row), currentVersion: row.currentVersion, isActive: row.isActive, createdAt: row.createdAt, updatedAt: row.updatedAt };
  });

  app.put("/api/workflows/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Workflow not found." });

    const doc = WorkflowDocumentSchema.parse(req.body);
    const structuralIssues = validateWorkflowStructure(doc);
    const configIssues = validateNodeConfigs(doc);
    const errors = [...structuralIssues, ...configIssues].filter((i) => i.severity === "error");

    const nextVersion = existing.currentVersion + 1;
    const row = await prisma.workflow.update({
      where: { id }, data: { ...documentToRowData(doc), currentVersion: nextVersion },
    });
    await prisma.workflowVersion.create({ data: { id: generateId("wfv"), workflowId: id, version: nextVersion, snapshot: JSON.stringify(doc) } });

    return reply.send({
      id: row.id, ...rowToDocument(row), currentVersion: row.currentVersion,
      validation: { issues: [...structuralIssues, ...configIssues], canRun: errors.length === 0 },
    });
  });

  app.delete("/api/workflows/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Workflow not found." });
    await prisma.schedule.deleteMany({ where: { workflowId: id } });
    await prisma.workflowVersion.deleteMany({ where: { workflowId: id } });
    await prisma.execution.deleteMany({ where: { workflowId: id } });
    await prisma.workflow.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  app.post("/api/workflows/:id/duplicate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Workflow not found." });
    const doc = rowToDocument(existing);
    doc.name = `${doc.name} (Copy)`;
    const row = await prisma.workflow.create({ data: { id: generateId("wf"), workspaceId: req.user!.workspaceId, ...documentToRowData(doc) } });
    await prisma.workflowVersion.create({ data: { id: generateId("wfv"), workflowId: row.id, version: 1, snapshot: JSON.stringify(doc) } });
    return reply.code(201).send({ id: row.id, ...doc });
  });

  app.get("/api/workflows/:id/validate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!row) return reply.code(404).send({ error: "Workflow not found." });
    const doc = rowToDocument(row);
    const issues = [...validateWorkflowStructure(doc), ...validateNodeConfigs(doc)];
    return reply.send({ issues, canRun: issues.filter((i) => i.severity === "error").length === 0 });
  });

  app.get("/api/workflows/:id/versions", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Workflow not found." });
    const versions = await prisma.workflowVersion.findMany({ where: { workflowId: id }, orderBy: { version: "desc" } });
    return versions.map((v) => ({ id: v.id, version: v.version, label: v.label, createdAt: v.createdAt }));
  });

  app.post("/api/workflows/:id/versions/:version/restore", async (req, reply) => {
    const { id, version } = req.params as { id: string; version: string };
    const existing = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Workflow not found." });
    const versionRow = await prisma.workflowVersion.findUnique({ where: { workflowId_version: { workflowId: id, version: Number(version) } } });
    if (!versionRow) return reply.code(404).send({ error: "Version not found." });
    const doc = WorkflowDocumentSchema.parse(JSON.parse(versionRow.snapshot));
    const nextVersion = existing.currentVersion + 1;
    const row = await prisma.workflow.update({ where: { id }, data: { ...documentToRowData(doc), currentVersion: nextVersion } });
    await prisma.workflowVersion.create({ data: { id: generateId("wfv"), workflowId: id, version: nextVersion, snapshot: versionRow.snapshot, label: `Restored from v${version}` } });
    return reply.send({ id: row.id, ...rowToDocument(row) });
  });

  app.get("/api/workflows/:id/export", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!row) return reply.code(404).send({ error: "Workflow not found." });
    const doc = rowToDocument(row);
    reply.header("Content-Disposition", `attachment; filename="${sanitizeFileName(doc.name)}.json"`);
    return reply.send(doc);
  });

  app.post("/api/workflows/import", async (req, reply) => {
    const parseResult = WorkflowDocumentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: "Invalid workflow JSON.",
        details: parseResult.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      });
    }
    const doc = parseResult.data;
    const structuralIssues = validateWorkflowStructure(doc);
    const row = await prisma.workflow.create({ data: { id: generateId("wf"), workspaceId: req.user!.workspaceId, ...documentToRowData(doc) } });
    await prisma.workflowVersion.create({ data: { id: generateId("wfv"), workflowId: row.id, version: 1, snapshot: JSON.stringify(doc) } });
    return reply.code(201).send({ id: row.id, ...doc, validation: { issues: structuralIssues } });
  });

  app.post("/api/workflows/:id/run", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!row) return reply.code(404).send({ error: "Workflow not found." });
    const doc = rowToDocument(row);
    const issues = [...validateWorkflowStructure(doc), ...validateNodeConfigs(doc)].filter((i) => i.severity === "error");
    if (issues.length > 0) {
      return reply.code(422).send({ error: "Workflow has validation errors and cannot run.", issues });
    }
    const body = (req.body ?? {}) as { variables?: Record<string, unknown> };
    const executionId = await runWorkflowExecution({
      workflowId: id, workspaceId: req.user!.workspaceId, triggeredBy: "manual", initialVariables: body.variables,
    });
    return reply.code(202).send({ executionId });
  });

  // "Test Step": runs the workflow from the trigger up to and including a
  // single node, using the in-memory (possibly unsaved) canvas document if
  // provided, so authors can iterate without saving first.
  app.post("/api/workflows/:id/test-step", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.workflow.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!row) return reply.code(404).send({ error: "Workflow not found." });
    const body = req.body as { nodeId?: string; document?: unknown };
    if (!body.nodeId) return reply.code(400).send({ error: "nodeId is required." });
    const doc = body.document ? WorkflowDocumentSchema.parse(body.document) : rowToDocument(row);
    const executionId = await runWorkflowExecution({
      workflowId: id, workspaceId: req.user!.workspaceId, triggeredBy: "manual",
      stopAfterNodeId: body.nodeId, overrideDocument: doc,
    });
    return reply.code(202).send({ executionId });
  });
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
}
