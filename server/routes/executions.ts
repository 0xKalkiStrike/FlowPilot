import { Router } from 'express';
import { db } from '../db/database.js';
import { workflowEngine } from '../services/engine/workflowEngine.js';

export const executionRouter = Router();

// GET /api/executions - List executions
executionRouter.get('/', (req, res) => {
  try {
    const { workflowId, status, limit = 50 } = req.query;
    let query = `SELECT id, workflow_id, workflow_name, trigger, status, current_node_id, start_time, end_time, duration_ms, error_message, created_at FROM executions`;
    const params: any[] = [];

    const conditions: string[] = [];
    if (workflowId) {
      conditions.push(`workflow_id = ?`);
      params.push(workflowId);
    }
    if (status) {
      conditions.push(`status = ?`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(String(limit), 10));

    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/executions/:id - Get execution details (with logs and screenshots)
executionRouter.get('/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM executions WHERE id = ?`).get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ success: false, error: 'Execution not found' });
    }

    res.json({
      success: true,
      data: {
        id: row.id,
        workflow_id: row.workflow_id,
        workflow_name: row.workflow_name,
        trigger: row.trigger,
        status: row.status,
        current_node_id: row.current_node_id,
        start_time: row.start_time,
        end_time: row.end_time,
        duration_ms: row.duration_ms,
        error_message: row.error_message,
        logs: JSON.parse(row.logs_json || '[]'),
        screenshots: JSON.parse(row.screenshots_json || '[]'),
        final_variables: JSON.parse(row.final_variables_json || '{}'),
        created_at: row.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/executions/:id/poll - HTTP Polling endpoint for environments where WebSockets are blocked
executionRouter.get('/:id/poll', (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM executions WHERE id = ?`).get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ success: false, error: 'Execution not found' });
    }

    res.json({
      success: true,
      data: {
        id: row.id,
        status: row.status,
        current_node_id: row.current_node_id,
        logs: JSON.parse(row.logs_json || '[]'),
        screenshots: JSON.parse(row.screenshots_json || '[]'),
        error_message: row.error_message,
        duration_ms: row.duration_ms
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workflows/:id/run - Run a workflow
executionRouter.post('/workflow/:id/run', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const { profileId, headless, slowMo, initialVariables } = req.body || {};

    const executionId = await workflowEngine.executeWorkflow({
      workflowId,
      trigger: 'manual_ui',
      profileId,
      headless: headless !== undefined ? headless : false,
      slowMo: slowMo !== undefined ? slowMo : 100,
      initialVariables
    });

    res.status(202).json({
      success: true,
      data: {
        executionId,
        workflowId,
        status: 'RUNNING',
        startedAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/executions/:id/cancel - Cancel execution
executionRouter.post('/:id/cancel', (req, res) => {
  try {
    const cancelled = workflowEngine.cancelExecution(req.params.id);
    if (!cancelled) {
      // Mark cancelled in DB anyway if it was stuck
      db.prepare(`UPDATE executions SET status = 'CANCELLED', end_time = ? WHERE id = ? AND status = 'RUNNING'`).run(new Date().toISOString(), req.params.id);
    }
    res.json({ success: true, message: 'Execution cancellation requested' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/executions/:id/resume - Resume paused execution
executionRouter.post('/:id/resume', (req, res) => {
  try {
    const resumed = workflowEngine.resumeExecution(req.params.id);
    if (!resumed) {
      return res.status(400).json({ success: false, error: 'No paused execution found to resume' });
    }
    res.json({ success: true, message: 'Execution resumed' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
