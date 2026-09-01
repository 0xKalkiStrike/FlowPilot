import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { db } from '../../db/database.js';
import { wsManager } from '../../ws/wsManager.js';
import { nodeExecutors, ExecutionContext } from './nodeExecutors.js';
import { profileService } from '../profileService.js';
import { SCREENSHOTS_DIR } from '../../config.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowExecutionOptions {
  workflowId: string;
  trigger?: string;
  profileId?: string;
  headless?: boolean;
  slowMo?: number;
  initialVariables?: Record<string, any>;
}

export interface ExecutionLogItem {
  timestamp: string;
  nodeId?: string;
  nodeTitle?: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export class WorkflowEngine {
  private activeExecutions: Map<string, {
    cancel: () => void;
    resume: () => void;
    browserContext?: BrowserContext;
  }> = new Map();

  public async executeWorkflow(options: WorkflowExecutionOptions): Promise<string> {
    const executionId = `exec_${uuidv4().substring(0, 8)}`;
    const workflowRow = db.prepare(`SELECT * FROM workflows WHERE id = ?`).get(options.workflowId) as any;
    if (!workflowRow) {
      throw new Error(`Workflow ${options.workflowId} not found`);
    }

    const workflowName = workflowRow.name;
    const nodes = JSON.parse(workflowRow.nodes_json || '[]');
    const edges = JSON.parse(workflowRow.edges_json || '[]');
    const initialVars = {
      ...(JSON.parse(workflowRow.variables_json || '{}')),
      ...(options.initialVariables || {})
    };

    const startTime = new Date().toISOString();

    // Create execution entry in DB
    db.prepare(`
      INSERT INTO executions (
        id, workflow_id, workflow_name, trigger, status, start_time, logs_json, screenshots_json, final_variables_json, created_at
      ) VALUES (?, ?, ?, ?, 'RUNNING', ?, '[]', '[]', '{}', ?)
    `).run(executionId, options.workflowId, workflowName, options.trigger || 'manual', startTime, startTime);

    wsManager.broadcastToExecution(executionId, 'EXECUTION_STARTED', {
      executionId,
      workflowId: options.workflowId,
      workflowName,
      status: 'RUNNING',
      startTime
    });

    // Run asynchronously
    this.runWorkflowInternal(executionId, options, nodes, edges, initialVars).catch(err => {
      console.error(`Execution ${executionId} unhandled error:`, err);
    });

    return executionId;
  }

  private async runWorkflowInternal(
    executionId: string,
    options: WorkflowExecutionOptions,
    nodes: any[],
    edges: any[],
    variables: Record<string, any>
  ) {
    const logs: ExecutionLogItem[] = [];
    const screenshots: string[] = [];
    let isCancelled = false;
    let resumeResolver: (() => void) | null = null;
    let browserContext: BrowserContext | null = null;
    let page: Page | null = null;

    const log = (message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info', nodeId?: string, nodeTitle?: string) => {
      const item: ExecutionLogItem = {
        timestamp: new Date().toISOString(),
        nodeId,
        nodeTitle,
        message,
        level
      };
      logs.push(item);
      wsManager.broadcastToExecution(executionId, 'EXECUTION_LOG', item);
    };

    const takeScreenshot = async (label: string = 'Screenshot'): Promise<string | null> => {
      if (!page) return null;
      try {
        const filename = `shot_${executionId}_${Date.now()}.png`;
        const filepath = path.join(SCREENSHOTS_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        screenshots.push(filename);
        wsManager.broadcastToExecution(executionId, 'EXECUTION_SCREENSHOT', { filename, label });
        return filename;
      } catch (err) {
        log(`Failed to capture screenshot: ${err}`, 'warn');
        return null;
      }
    };

    const pauseForHumanVerification = async (reason: string) => {
      log(`Execution PAUSED: ${reason}`, 'warn');
      db.prepare(`UPDATE executions SET status = 'PAUSED' WHERE id = ?`).run(executionId);
      wsManager.broadcastToExecution(executionId, 'EXECUTION_PAUSED', { executionId, reason });

      await new Promise<void>((resolve) => {
        resumeResolver = resolve;
      });

      db.prepare(`UPDATE executions SET status = 'RUNNING' WHERE id = ?`).run(executionId);
      wsManager.broadcastToExecution(executionId, 'EXECUTION_RESUMED', { executionId });
    };

    this.activeExecutions.set(executionId, {
      cancel: () => {
        isCancelled = true;
        if (resumeResolver) resumeResolver();
        log('Execution cancelled by user', 'warn');
      },
      resume: () => {
        if (resumeResolver) {
          resumeResolver();
          resumeResolver = null;
        }
      }
    });

    const startTimestamp = Date.now();

    try {
      if (nodes.length === 0) {
        throw new Error('Workflow contains no nodes to execute');
      }

      // Detect if workflow has browser automation nodes
      const requiresBrowser = nodes.some((n: any) => {
        const t = n.type || n.data?.type || '';
        return (
          t.startsWith('browser_') ||
          t.startsWith('form_') ||
          t.startsWith('interaction_') ||
          t.startsWith('payment_') ||
          t === 'action_set_quantity' ||
          t === 'file_upload' ||
          t === 'file_download'
        );
      });

      if (requiresBrowser) {
        log(`Launching Playwright browser engine...`, 'info');

        // Setup browser profile
        const profileDir = profileService.getProfileDir(options.profileId || 'default');
        const isHeadless = options.headless !== undefined ? options.headless : false;
        const slowMo = options.slowMo !== undefined ? options.slowMo : 100;

        browserContext = await chromium.launchPersistentContext(profileDir, {
          headless: isHeadless,
          slowMo: slowMo,
          viewport: { width: 1280, height: 800 },
          args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-infobars',
            '--start-maximized'
          ]
        });

        this.activeExecutions.get(executionId)!.browserContext = browserContext;
        page = browserContext.pages().length > 0 ? browserContext.pages()[0] : await browserContext.newPage();
      } else {
        log(`⚡ Fast Engine Mode: Executing Zero-Key Code & Data pipeline (Sub-second runtime)...`, 'info');
      }

      const execContext: ExecutionContext = {
        page: page || undefined,
        context: browserContext || undefined,
        variables,
        log: (msg, lvl) => log(msg, lvl),
        takeScreenshot,
        pauseForHumanVerification,
        executionId
      };

      // Build execution graph
      const nodeMap = new Map<string, any>();
      nodes.forEach((n: any) => nodeMap.set(n.id, n));

      // Find root / trigger nodes
      const targetNodeIds = new Set(edges.map((e: any) => e.target));
      let startNodes = nodes.filter((n: any) => !targetNodeIds.has(n.id));

      if (startNodes.length === 0) {
        startNodes = [nodes[0]];
      }

      // Execute graph using queue
      const queue: { nodeId: string; fromHandle?: string }[] = startNodes.map((n: any) => ({ nodeId: n.id }));
      const visitedNodes = new Set<string>();

      while (queue.length > 0) {
        if (isCancelled) {
          throw new Error('Execution was cancelled');
        }

        const current = queue.shift()!;
        const node = nodeMap.get(current.nodeId);
        if (!node) continue;

        const nodeType = node.type || node.data?.type;
        const nodeTitle = node.data?.label || node.data?.title || nodeType;
        const executor = nodeExecutors[nodeType];

        // Notify node start
        db.prepare(`UPDATE executions SET current_node_id = ? WHERE id = ?`).run(node.id, executionId);
        wsManager.broadcastToExecution(executionId, 'EXECUTION_NODE_START', {
          executionId,
          nodeId: node.id,
          nodeType,
          nodeTitle
        });

        log(`▶ Running: ${nodeTitle}`, 'info', node.id, nodeTitle);

        if (!executor) {
          log(`Skipping unrecognized node type: ${nodeType}`, 'warn', node.id, nodeTitle);
        } else {
          // Node retry and error handling policy
          const retries = parseInt(node.data?.retries || '0', 10);
          const continueOnError = Boolean(node.data?.continueOnError);
          let success = false;
          let lastError: any = null;
          let nodeResult: { nextHandle?: string; output?: any } = {};

          for (let attempt = 0; attempt <= retries; attempt++) {
            if (isCancelled) break;
            try {
              if (attempt > 0) {
                log(`Retry attempt #${attempt} for ${nodeTitle}...`, 'warn', node.id, nodeTitle);
                if (page) {
                  await page.waitForTimeout(1000 * attempt);
                } else {
                  await new Promise(r => setTimeout(r, 1000 * attempt));
                }
              }

              nodeResult = await executor(node.data || {}, execContext);
              success = true;
              break;
            } catch (err: any) {
              lastError = err;
              log(`Error in ${nodeTitle} (attempt ${attempt + 1}/${retries + 1}): ${err.message}`, 'error', node.id, nodeTitle);
            }
          }

          if (!success) {
            if (page) {
              await takeScreenshot(`Error at ${nodeTitle}`);
            }
            if (!continueOnError) {
              wsManager.broadcastToExecution(executionId, 'EXECUTION_NODE_FAILED', {
                executionId,
                nodeId: node.id,
                error: lastError?.message
              });
              throw lastError || new Error(`Node ${nodeTitle} failed`);
            } else {
              log(`Continue on Error enabled for ${nodeTitle}, proceeding...`, 'warn', node.id, nodeTitle);
            }
          }

          wsManager.broadcastToExecution(executionId, 'EXECUTION_NODE_SUCCESS', {
            executionId,
            nodeId: node.id,
            output: nodeResult.output
          });

          // Determine next outgoing edges
          const outgoingEdges = edges.filter((e: any) => e.source === node.id);
          for (const edge of outgoingEdges) {
            // Check handle matching for branch nodes (IF, Switch, Loop)
            if (nodeResult.nextHandle) {
              if (edge.sourceHandle && edge.sourceHandle !== nodeResult.nextHandle) {
                continue; // Skip non-matching branch
              }
            }
            queue.push({ nodeId: edge.target, fromHandle: edge.sourceHandle });
          }
        }
      }

      // Completed successfully
      const endTime = new Date().toISOString();
      const duration = Date.now() - startTimestamp;

      log(`✓ Workflow execution completed successfully in ${duration}ms`, 'success');

      db.prepare(`
        UPDATE executions
        SET status = 'SUCCESS', end_time = ?, duration_ms = ?, logs_json = ?, screenshots_json = ?, final_variables_json = ?, current_node_id = NULL
        WHERE id = ?
      `).run(endTime, duration, JSON.stringify(logs), JSON.stringify(screenshots), JSON.stringify(variables), executionId);

      wsManager.broadcastToExecution(executionId, 'EXECUTION_COMPLETED', {
        executionId,
        status: 'SUCCESS',
        duration,
        endTime
      });

    } catch (err: any) {
      const endTime = new Date().toISOString();
      const duration = Date.now() - startTimestamp;
      const status = isCancelled ? 'CANCELLED' : 'FAILED';

      log(`Execution ended with status: ${status}. Details: ${err.message}`, 'error');

      db.prepare(`
        UPDATE executions
        SET status = ?, end_time = ?, duration_ms = ?, error_message = ?, logs_json = ?, screenshots_json = ?, final_variables_json = ?, current_node_id = NULL
        WHERE id = ?
      `).run(status, endTime, duration, err.message, JSON.stringify(logs), JSON.stringify(screenshots), JSON.stringify(variables), executionId);

      wsManager.broadcastToExecution(executionId, 'EXECUTION_COMPLETED', {
        executionId,
        status,
        duration,
        endTime,
        error: err.message
      });
    } finally {
      this.activeExecutions.delete(executionId);
      if (browserContext) {
        try {
          await browserContext.close();
        } catch {}
      }
    }
  }

  public cancelExecution(executionId: string): boolean {
    const active = this.activeExecutions.get(executionId);
    if (active) {
      active.cancel();
      return true;
    }
    return false;
  }

  public resumeExecution(executionId: string): boolean {
    const active = this.activeExecutions.get(executionId);
    if (active) {
      active.resume();
      return true;
    }
    return false;
  }

  /**
   * Execute an individual node in real-time (for instant step testing in UI drawer)
   */
  public async testSingleNode(nodeType: string, nodeData: any, sampleVariables: Record<string, any> = {}) {
    const logs: ExecutionLogItem[] = [];
    const startTs = Date.now();

    const log = (message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') => {
      logs.push({
        timestamp: new Date().toISOString(),
        nodeTitle: nodeData?.label || nodeType,
        message,
        level
      });
    };

    const variables = { ...sampleVariables };
    const executor = nodeExecutors[nodeType];

    if (!executor) {
      throw new Error(`Node type '${nodeType}' does not have an executor.`);
    }

    const execContext: ExecutionContext = {
      variables,
      log,
      takeScreenshot: async () => null,
      pauseForHumanVerification: async () => {},
      executionId: `test_${Date.now()}`
    };

    try {
      const result = await executor(nodeData || {}, execContext);
      const duration = Date.now() - startTs;

      return {
        success: true,
        output: result.output !== undefined ? result.output : null,
        nextHandle: result.nextHandle,
        variables,
        logs,
        duration
      };
    } catch (err: any) {
      const duration = Date.now() - startTs;
      log(`Execution Error: ${err.message}`, 'error');
      return {
        success: false,
        error: err.message,
        variables,
        logs,
        duration
      };
    }
  }
}

export const workflowEngine = new WorkflowEngine();
