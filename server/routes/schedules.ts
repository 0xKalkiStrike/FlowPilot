import { Router } from 'express';
import { schedulerService } from '../services/schedulerService.js';
import { z } from 'zod';

export const scheduleRouter = Router();

scheduleRouter.get('/', (req, res) => {
  try {
    const list = schedulerService.list();
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

scheduleRouter.post('/', (req, res) => {
  try {
    const { workflow_id, name, cron_expression, frequency, time, timezone } = req.body;
    if (!workflow_id || !name) {
      return res.status(400).json({ success: false, error: 'Workflow and schedule name are required' });
    }
    const created = schedulerService.create({ workflow_id, name, cron_expression, frequency, time, timezone });
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

scheduleRouter.patch('/:id/toggle', (req, res) => {
  try {
    const { is_enabled } = req.body;
    const updated = schedulerService.toggleActive(req.params.id, Boolean(is_enabled));
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

scheduleRouter.post('/:id/run', async (req, res) => {
  try {
    const execId = await schedulerService.triggerNow(req.params.id);
    res.json({ success: true, data: { executionId: execId } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

scheduleRouter.delete('/:id', (req, res) => {
  try {
    const deleted = schedulerService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }
    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
