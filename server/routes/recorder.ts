import { Router } from 'express';
import { recorderService } from '../services/recorderService.js';

export const recorderRouter = Router();

// POST /api/recorder/start - Launch browser and record actions
recorderRouter.post('/start', async (req, res) => {
  try {
    const { url, profileId } = req.body || {};
    const result = await recorderService.startRecording(url || 'https://google.com', profileId || 'default');
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/recorder/stop - Stop recording and get generated nodes & edges
recorderRouter.post('/stop', async (req, res) => {
  try {
    const { recordingId } = req.body;
    if (!recordingId) {
      return res.status(400).json({ success: false, error: 'Recording ID is required' });
    }
    const result = await recorderService.stopRecording(recordingId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
