import { z } from "zod";

export const ExecutionStatus = {
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  PAUSED: "PAUSED",
} as const;
export type ExecutionStatusType = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

export const LogLevel = { debug: "debug", info: "info", warn: "warn", error: "error" } as const;
export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

export const ExecutionLogEntrySchema = z.object({
  id: z.string(),
  executionId: z.string(),
  nodeId: z.string().optional(),
  nodeLabel: z.string().optional(),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  timestamp: z.string(),
  status: z.enum(["started", "success", "failed", "skipped"]).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type ExecutionLogEntry = z.infer<typeof ExecutionLogEntrySchema>;

export interface ExecutionEvent {
  type: "log" | "status" | "node_status" | "screenshot" | "done";
  executionId: string;
  payload: unknown;
}
