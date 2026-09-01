import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { liveBus } from "../services/liveBus.js";
import { cancelExecution } from "../services/executionRunner.js";
import { ExecutionStatus } from "@flowpilot/workflow-schema";

export async function executionRoutes(app: FastifyInstance) {
  app.get("/api/executions", async (req) => {
    const query = req.query as { workflowId?: string; status?: string; limit?: string };
    const rows = await prisma.execution.findMany({
      where: {
        workspaceId: req.user!.workspaceId,
        ...(query.workflowId ? { workflowId: query.workflowId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { startedAt: "desc" },
      take: query.limit ? Number(query.limit) : 50,
      include: { workflow: { select: { name: true } } },
    });
    return rows.map((r) => ({
      id: r.id, workflowId: r.workflowId, workflowName: r.workflow.name, status: r.status,
      triggeredBy: r.triggeredBy, startedAt: r.startedAt, finishedAt: r.finishedAt,
      durationMs: r.durationMs, error: r.error, currentNodeId: r.currentNodeId,
    }));
  });

  app.get("/api/executions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.execution.findFirst({ where: { id, workspaceId: req.user!.workspaceId }, include: { workflow: true } });
    if (!row) return reply.code(404).send({ error: "Execution not found." });
    const logs = await prisma.executionLog.findMany({ where: { executionId: id }, orderBy: { timestamp: "asc" } });
    const files = await prisma.fileRecord.findMany({ where: { executionId: id } });
    return {
      id: row.id, workflowId: row.workflowId, workflowName: row.workflow.name, status: row.status,
      triggeredBy: row.triggeredBy, startedAt: row.startedAt, finishedAt: row.finishedAt,
      durationMs: row.durationMs, error: row.error, currentNodeId: row.currentNodeId,
      variables: JSON.parse(row.variablesSnapshot || "{}"),
      logs: logs.map((l) => ({ id: l.id, nodeId: l.nodeId, nodeLabel: l.nodeLabel, level: l.level, message: l.message, status: l.status, data: l.data ? JSON.parse(l.data) : undefined, timestamp: l.timestamp })),
      files: files.map((f) => ({ id: f.id, kind: f.kind, fileName: f.fileName, sizeBytes: f.sizeBytes, createdAt: f.createdAt })),
    };
  });

  app.post("/api/executions/:id/cancel", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.execution.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!row) return reply.code(404).send({ error: "Execution not found." });
    if (row.finishedAt) return reply.code(400).send({ error: "Execution has already finished." });
    cancelExecution(id);
    await prisma.execution.update({ where: { id }, data: { status: ExecutionStatus.CANCELLED } });
    return reply.send({ ok: true });
  });

  // Server-Sent Events stream of live log/status/node_status events for one execution.
  app.get("/api/executions/:id/stream", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.execution.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!row) return reply.code(404).send({ error: "Execution not found." });

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Replay history so a client that connects mid-run (or after completion) still sees everything.
    const logs = await prisma.executionLog.findMany({ where: { executionId: id }, orderBy: { timestamp: "asc" } });
    for (const l of logs) send("log", { id: l.id, nodeId: l.nodeId, nodeLabel: l.nodeLabel, level: l.level, message: l.message, status: l.status, timestamp: l.timestamp });
    send("status", { status: row.status });

    if (row.finishedAt) {
      send("done", { status: row.status });
      reply.raw.end();
      return;
    }

    const emitter = liveBus.get(id);
    const onEvent = (event: any) => {
      send(event.type, event.payload);
      if (event.type === "done") {
        cleanup();
        reply.raw.end();
      }
    };
    const heartbeat = setInterval(() => reply.raw.write(": ping\n\n"), 15000);
    function cleanup() {
      clearInterval(heartbeat);
      emitter.off("event", onEvent);
    }
    emitter.on("event", onEvent);
    req.raw.on("close", cleanup);
  });
}
