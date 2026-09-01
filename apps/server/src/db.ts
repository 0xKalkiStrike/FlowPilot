import path from "node:path";
import { createDb } from "./db/sqlite.js";
import { env } from "./env.js";

export const prisma = createDb(path.join(env.storageDir, "flowpilot.db"));

export interface UserRow {
  id: string; email: string; passwordHash: string; passwordSalt: string; name: string; createdAt: Date; updatedAt: Date;
}
export interface WorkspaceRow { id: string; name: string; ownerId: string; createdAt: Date }
export interface WorkflowRow {
  id: string; workspaceId: string; name: string; description: string; schemaVersion: string; triggerType: string;
  triggerConfig: string; variables: string; nodes: string; edges: string; browserConfig: string; isActive: boolean;
  currentVersion: number; createdAt: Date; updatedAt: Date;
}
export interface WorkflowVersionRow { id: string; workflowId: string; version: number; label: string; snapshot: string; createdAt: Date }
export interface CredentialRow { id: string; workspaceId: string; name: string; type: string; encryptedSecret: string; fieldNames: string; createdAt: Date; updatedAt: Date }
export interface BrowserProfileRow { id: string; workspaceId: string; name: string; dirName: string; createdAt: Date; lastUsedAt: Date | null }
export interface ExecutionRow {
  id: string; workflowId: string; workspaceId: string; status: string; triggeredBy: string; startedAt: Date;
  finishedAt: Date | null; durationMs: number | null; error: string | null; currentNodeId: string | null; variablesSnapshot: string;
}
export interface ExecutionLogRow { id: string; executionId: string; nodeId: string | null; nodeLabel: string | null; level: string; message: string; status: string | null; data: string | null; timestamp: Date }
export interface ScheduleRow {
  id: string; workflowId: string; workspaceId: string; frequency: string; time: string; timezone: string; daysOfWeek: string;
  dayOfMonth: number | null; intervalMinutes: number | null; cron: string | null; runOnceAt: Date | null; enabled: boolean;
  nextRunAt: Date | null; lastRunAt: Date | null; lastRunStatus: string | null; createdAt: Date;
}
export interface TemplateRow { id: string; workspaceId: string | null; name: string; description: string; category: string; workflowJson: string; isBuiltIn: boolean; createdAt: Date }
export interface FileRecordRow { id: string; workspaceId: string; executionId: string | null; kind: string; fileName: string; filePath: string; sizeBytes: number; createdAt: Date }
export interface VariableRow { id: string; workspaceId: string; name: string; type: string; defaultValue: string | null; sensitive: boolean; createdAt: Date }
export interface ConnectorRow { id: string; workspaceId: string; type: string; name: string; config: string; credentialId: string | null; createdAt: Date }
