import fs from "node:fs/promises";
import path from "node:path";
import { WorkflowEngine } from "@flowpilot/workflow-engine";
import { ExecutionStatus, type ExecutionEvent, type WorkflowDocument } from "@flowpilot/workflow-schema";
import { generateId } from "@flowpilot/shared";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { liveBus } from "./liveBus.js";
import { resolveCredentialFields } from "./credentials.js";
import { rowToDocument } from "./workflowSerializer.js";

const cancelledExecutions = new Set<string>();

export function cancelExecution(executionId: string) {
  cancelledExecutions.add(executionId);
}

export async function runWorkflowExecution(params: {
  workflowId: string;
  workspaceId: string;
  triggeredBy: "manual" | "schedule" | "api";
  initialVariables?: Record<string, unknown>;
  stopAfterNodeId?: string;
  overrideDocument?: WorkflowDocument;
}): Promise<string> {
  const workflowRow = await prisma.workflow.findUniqueOrThrow({ where: { id: params.workflowId } });
  const doc = params.overrideDocument ?? rowToDocument(workflowRow);

  const execution = await prisma.execution.create({
    data: {
      id: generateId("exec"),
      workflowId: params.workflowId,
      workspaceId: params.workspaceId,
      status: ExecutionStatus.QUEUED,
      triggeredBy: params.triggeredBy,
    },
  });

  void executeNow(execution.id, params.workspaceId, doc, params.initialVariables, params.stopAfterNodeId);

  return execution.id;
}

function createPersister() {
  let chain: Promise<void> = Promise.resolve();
  return {
    enqueue(fn: () => Promise<void>) {
      chain = chain.then(fn).catch((err) => console.error("[execution-persist]", err));
    },
    flush: () => chain,
  };
}

async function fileSize(p: string): Promise<number> {
  try {
    return (await fs.stat(p)).size;
  } catch {
    return 0;
  }
}

async function executeNow(
  executionId: string,
  workspaceId: string,
  doc: WorkflowDocument,
  initialVariables?: Record<string, unknown>,
  stopAfterNodeId?: string
) {
  const persister = createPersister();

  async function handleEvent(event: ExecutionEvent) {
    if (event.type === "log") {
      const p = event.payload as any;
      await prisma.executionLog.create({
        data: {
          id: p.id, executionId, nodeId: p.nodeId, nodeLabel: p.nodeLabel, level: p.level,
          message: p.message, status: p.status, data: p.data ? JSON.stringify(p.data) : null,
          timestamp: new Date(p.timestamp),
        },
      });
    } else if (event.type === "node_status") {
      const p = event.payload as any;
      await prisma.execution.update({ where: { id: executionId }, data: { currentNodeId: p.nodeId } });
      // Persist a timeline-friendly log row so the Runs page can reconstruct
      // the step-by-step timeline after the run has finished, not just live.
      await prisma.executionLog.create({
        data: {
          id: `nlog_${p.nodeId}_${p.status}_${Date.now()}`, executionId, nodeId: p.nodeId, nodeLabel: p.label,
          level: p.status === "failed" ? "error" : "info",
          message: p.status === "failed" ? `Failed: ${p.error ?? "unknown error"}` : `${p.label ?? p.nodeId} — ${p.status}`,
          status: p.status, data: p.data ? JSON.stringify(p.data) : null, timestamp: new Date(),
        },
      });
      if (p.screenshotPath) {
        await prisma.fileRecord.create({
          data: {
            workspaceId, executionId, kind: "screenshot", fileName: path.basename(p.screenshotPath),
            filePath: p.screenshotPath, sizeBytes: await fileSize(p.screenshotPath),
          },
        });
      }
      const output = p.data as Record<string, unknown> | undefined;
      if (output?.filePath && typeof output.filePath === "string") {
        await prisma.fileRecord.create({
          data: {
            workspaceId, executionId, kind: "download", fileName: path.basename(output.filePath),
            filePath: output.filePath, sizeBytes: await fileSize(output.filePath),
          },
        });
      }
    } else if (event.type === "status") {
      const p = event.payload as any;
      await prisma.execution.update({ where: { id: executionId }, data: { status: p.status, error: p.error } });
    }
  }

  const onEvent = (event: ExecutionEvent) => {
    liveBus.publish(event);
    persister.enqueue(() => handleEvent(event));
  };

  const engine = new WorkflowEngine();
  const result = await engine.run({
    workflow: doc,
    executionId,
    storageDir: env.storageDir,
    screenshotsDir: env.screenshotsDir,
    downloadsDir: env.downloadsDir,
    uploadsDir: env.uploadsDir,
    browserProfilesDir: env.browserProfilesDir,
    initialVariables,
    resolveCredential: resolveCredentialFields,
    onEvent,
    isCancelled: () => cancelledExecutions.has(executionId),
    stopAfterNodeId,
  });

  await persister.flush();
  const wasCancelled = cancelledExecutions.has(executionId);
  cancelledExecutions.delete(executionId);

  const startedRow = await prisma.execution.findUniqueOrThrow({ where: { id: executionId } });
  const finishedAt = new Date();
  const status = wasCancelled ? ExecutionStatus.CANCELLED : result.status;
  await prisma.execution.update({
    where: { id: executionId },
    data: {
      status,
      finishedAt,
      error: wasCancelled ? "Cancelled by user." : result.error,
      variablesSnapshot: JSON.stringify(result.variables),
      durationMs: finishedAt.getTime() - startedRow.startedAt.getTime(),
    },
  });

  liveBus.publish({ type: "done", executionId, payload: { status } });
  liveBus.cleanupSoon(executionId);
}
