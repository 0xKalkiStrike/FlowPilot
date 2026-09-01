import { Router } from 'express';
import { db } from '../db/database.js';

export const statsRouter = Router();

// GET /api/stats/dashboard - High-level metrics for dashboard
statsRouter.get('/dashboard', (req, res) => {
  try {
    const totalWorkflows = (db.prepare(`SELECT COUNT(*) as count FROM workflows`).get() as any).count || 0;
    const activeWorkflows = (db.prepare(`SELECT COUNT(*) as count FROM workflows WHERE is_active = 1`).get() as any).count || 0;
    const totalSchedules = (db.prepare(`SELECT COUNT(*) as count FROM schedules WHERE is_enabled = 1`).get() as any).count || 0;
    const totalCredentials = (db.prepare(`SELECT COUNT(*) as count FROM credentials`).get() as any).count || 0;

    const successfulRuns = (db.prepare(`SELECT COUNT(*) as count FROM executions WHERE status = 'SUCCESS'`).get() as any).count || 0;
    const failedRuns = (db.prepare(`SELECT COUNT(*) as count FROM executions WHERE status = 'FAILED'`).get() as any).count || 0;
    const totalRuns = (db.prepare(`SELECT COUNT(*) as count FROM executions`).get() as any).count || 0;

    const recentWorkflows = db.prepare(`SELECT id, name, description, trigger_type, updated_at FROM workflows ORDER BY updated_at DESC LIMIT 5`).all();
    const recentExecutions = db.prepare(`SELECT id, workflow_id, workflow_name, status, start_time, duration_ms, error_message FROM executions ORDER BY created_at DESC LIMIT 6`).all();

    res.json({
      success: true,
      data: {
        metrics: {
          totalWorkflows,
          activeWorkflows,
          totalSchedules,
          totalCredentials,
          successfulRuns,
          failedRuns,
          totalRuns,
          successRate: totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 100
        },
        recentWorkflows,
        recentExecutions
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stats/search - Global search across Workflows, Templates, Credentials, Runs
statsRouter.get('/search', (req, res) => {
  try {
    const query = String(req.query.q || '').trim().toLowerCase();
    if (!query) {
      return res.json({ success: true, data: { workflows: [], credentials: [], executions: [] } });
    }

    const workflows = db.prepare(`SELECT id, name, description FROM workflows WHERE LOWER(name) LIKE ? OR LOWER(description) LIKE ? LIMIT 5`).all(`%${query}%`, `%${query}%`);
    const credentials = db.prepare(`SELECT id, name, type FROM credentials WHERE LOWER(name) LIKE ? LIMIT 5`).all(`%${query}%`);
    const executions = db.prepare(`SELECT id, workflow_name, status, created_at FROM executions WHERE LOWER(workflow_name) LIKE ? OR LOWER(id) LIKE ? LIMIT 5`).all(`%${query}%`, `%${query}%`);

    res.json({
      success: true,
      data: {
        workflows,
        credentials,
        executions
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
