import type { WorkflowRow } from "../db.js";
import { WorkflowDocumentSchema, type WorkflowDocument } from "@flowpilot/workflow-schema";

export function rowToDocument(row: WorkflowRow): WorkflowDocument {
  return WorkflowDocumentSchema.parse({
    schemaVersion: row.schemaVersion,
    name: row.name,
    description: row.description,
    trigger: { type: row.triggerType, config: JSON.parse(row.triggerConfig || "{}") },
    variables: JSON.parse(row.variables || "[]"),
    nodes: JSON.parse(row.nodes || "[]"),
    edges: JSON.parse(row.edges || "[]"),
    browserConfig: JSON.parse(row.browserConfig || "{}"),
  });
}

export function documentToRowData(doc: WorkflowDocument) {
  return {
    name: doc.name,
    description: doc.description ?? "",
    schemaVersion: doc.schemaVersion,
    triggerType: doc.trigger.type,
    triggerConfig: JSON.stringify(doc.trigger.config ?? {}),
    variables: JSON.stringify(doc.variables ?? []),
    nodes: JSON.stringify(doc.nodes ?? []),
    edges: JSON.stringify(doc.edges ?? []),
    browserConfig: JSON.stringify(doc.browserConfig ?? {}),
  };
}
