import { Router } from 'express';
import { profileService } from '../services/profileService.js';
import { z } from 'zod';

export const profileRouter = Router();

profileRouter.get('/', (req, res) => {
  try {
    const list = profileService.list();
    res.json({ success: true, data: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

profileRouter.post('/', (req, res) => {
  try {
    const { name, userAgent } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Profile name is required' });
    }
    const created = profileService.create(name, userAgent);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

profileRouter.post('/:id/clear', (req, res) => {
  try {
    const cleared = profileService.clearSession(req.params.id);
    if (!cleared) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    res.json({ success: true, message: 'Session data and cookies cleared successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

profileRouter.delete('/:id', (req, res) => {
  try {
    const deleted = profileService.delete(req.params.id);
    if (!deleted) {
      return res.status(400).json({ success: false, error: 'Cannot delete default profile or profile not found' });
    }
    res.json({ success: true, message: 'Profile deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
