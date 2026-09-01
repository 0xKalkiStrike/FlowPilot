import type { Page, BrowserContext } from "playwright";
import type { ElementTarget } from "@flowpilot/workflow-schema";

export class SelectorResolutionError extends Error {
  constructor(message: string, public target: ElementTarget) {
    super(message);
    this.name = "SelectorResolutionError";
  }
}

export class HumanVerificationRequiredError extends Error {
  constructor(message = "Human verification required.") {
    super(message);
    this.name = "HumanVerificationRequiredError";
  }
}

export interface BrowserRuntimeConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  userAgent?: string;
  locale?: string;
  timezone?: string;
  slowMoMs: number;
  defaultTimeoutMs: number;
}

/** Everything a node executor needs to act on the live browser + workflow state. */
export interface NodeExecutionContext {
  page: Page;
  context: BrowserContext;
  config: Record<string, unknown>;
  target?: ElementTarget;
  variables: Record<string, unknown>;
  setVariable: (name: string, value: unknown) => void;
  credential?: Record<string, string>;
  timeoutMs: number;
  storageDir: string;
  screenshotsDir: string;
  downloadsDir: string;
  uploadsDir: string;
  log: (level: "debug" | "info" | "warn" | "error", message: string, data?: Record<string, unknown>) => void;
  executionId: string;
}

export interface NodeExecutionResult {
  output?: Record<string, unknown>;
  screenshotPath?: string;
  branch?: string; // for logic.if / logic.switch: which output port to follow
}

export type NodeExecutor = (ctx: NodeExecutionContext) => Promise<NodeExecutionResult>;
