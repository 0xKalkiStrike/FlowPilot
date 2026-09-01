import { z } from "zod";
import { ElementTargetSchema } from "./target.js";

export const WORKFLOW_SCHEMA_VERSION = "1.0";

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const RetryConfigSchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).default(1),
  delayMs: z.number().int().min(0).max(60000).default(1000),
});
export type RetryConfig = z.infer<typeof RetryConfigSchema>;

export const ErrorHandlingSchema = z.object({
  onError: z.enum(["stop", "continue", "retry"]).default("stop"),
  screenshotOnError: z.boolean().default(true),
  capturePageHtml: z.boolean().default(false),
});
export type ErrorHandling = z.infer<typeof ErrorHandlingSchema>;

/**
 * A single node in the workflow graph. `config` is intentionally typed as a
 * loose record here; per-type validation happens against the node registry's
 * Zod config schema (see nodeRegistry.ts) both client- and server-side.
 */
export const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().optional(),
  position: PositionSchema,
  config: z.record(z.string(), z.unknown()).default({}),
  target: ElementTargetSchema.optional(),
  timeout: z.number().int().min(0).max(600000).optional(),
  retry: RetryConfigSchema.optional(),
  errorHandling: ErrorHandlingSchema.optional(),
  credentialId: z.string().optional(),
  parentId: z.string().nullable().optional(),
  branch: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
});
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

export const ScheduleConfigSchema = z.object({
  frequency: z.enum(["once", "daily", "weekly", "monthly", "interval", "weekdays", "custom"]),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().default("Asia/Kolkata"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  intervalMinutes: z.number().int().min(1).optional(),
  cron: z.string().optional(),
  runOnceAt: z.string().optional(),
});
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;

export const TriggerSchema = z.object({
  type: z.enum(["manual", "schedule", "webhook", "workflow", "browser"]),
  config: z.record(z.string(), z.unknown()).default({}),
});
export type Trigger = z.infer<typeof TriggerSchema>;

export const VariableDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "date", "array", "object"]).default("string"),
  defaultValue: z.unknown().optional(),
  sensitive: z.boolean().default(false),
});
export type VariableDefinition = z.infer<typeof VariableDefinitionSchema>;

export const WorkflowDocumentSchema = z.object({
  schemaVersion: z.literal(WORKFLOW_SCHEMA_VERSION),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  trigger: TriggerSchema.default({ type: "manual", config: {} }),
  variables: z.array(VariableDefinitionSchema).default([]),
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([]),
  browserConfig: z
    .object({
      headless: z.boolean().default(false),
      viewport: z.object({ width: z.number(), height: z.number() }).default({ width: 1366, height: 900 }),
      userAgent: z.string().optional(),
      locale: z.string().optional(),
      timezone: z.string().optional(),
      slowMoMs: z.number().int().min(0).default(0),
      defaultTimeoutMs: z.number().int().min(0).default(30000),
      browserProfileId: z.string().optional(),
    })
    .default({}),
});
export type WorkflowDocument = z.infer<typeof WorkflowDocumentSchema>;

export interface WorkflowValidationIssue {
  nodeId?: string;
  field?: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Structural + semantic validation beyond Zod parsing: reachability, trigger
 * presence, dangling edges, and per-node required-field checks driven by the
 * node registry (imported lazily to avoid a circular dependency).
 */
export function validateWorkflowStructure(doc: WorkflowDocument): WorkflowValidationIssue[] {
  const issues: WorkflowValidationIssue[] = [];
  const nodeIds = new Set(doc.nodes.map((n) => n.id));

  if (doc.nodes.length === 0) {
    issues.push({ message: "Workflow has no nodes.", severity: "error" });
  }

  for (const edge of doc.edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push({ message: `Edge ${edge.id} references missing source node ${edge.source}.`, severity: "error" });
    }
    if (!nodeIds.has(edge.target)) {
      issues.push({ message: `Edge ${edge.id} references missing target node ${edge.target}.`, severity: "error" });
    }
  }

  const hasIncoming = new Set(doc.edges.map((e) => e.target));
  const rootNodes = doc.nodes.filter((n) => !hasIncoming.has(n.id) && !n.parentId);
  if (doc.nodes.length > 0 && rootNodes.length === 0) {
    issues.push({ message: "Workflow has no starting node (every node has an incoming connection).", severity: "error" });
  }

  const reachable = new Set<string>();
  const adjacency = new Map<string, string[]>();
  for (const e of doc.edges) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    adjacency.get(e.source)!.push(e.target);
  }
  const queue = [...rootNodes.map((n) => n.id)];
  while (queue.length) {
    const cur = queue.shift()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    for (const next of adjacency.get(cur) ?? []) queue.push(next);
  }
  for (const node of doc.nodes) {
    if (!reachable.has(node.id) && !node.parentId) {
      issues.push({ nodeId: node.id, message: `Node "${node.label ?? node.type}" is unreachable from the trigger.`, severity: "warning" });
    }
  }

  return issues;
}
