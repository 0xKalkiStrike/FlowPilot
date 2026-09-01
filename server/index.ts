import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { PORT, SCREENSHOTS_DIR, DOWNLOADS_DIR, DATA_DIR } from './config.js';
import { initDatabase } from './db/database.js';
import { wsManager } from './ws/wsManager.js';
import { schedulerService } from './services/schedulerService.js';

import { workflowRouter } from './routes/workflows.js';
import { executionRouter } from './routes/executions.js';
import { credentialRouter } from './routes/credentials.js';
import { profileRouter } from './routes/profiles.js';
import { scheduleRouter } from './routes/schedules.js';
import { recorderRouter } from './routes/recorder.js';
import { templateRouter } from './routes/templates.js';
import { statsRouter } from './routes/stats.js';

// 1. Initialize Database
initDatabase();

// 2. Initialize Scheduler
schedulerService.init();

// 3. Create Express app & HTTP Server
const app = express();
const server = http.createServer(app);

// 4. Initialize WebSocket Server
wsManager.init(server);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for screenshots and downloads
app.use('/screenshots', express.static(SCREENSHOTS_DIR));
app.use('/downloads', express.static(DOWNLOADS_DIR));

// API Routes
app.use('/api/workflows', workflowRouter);
app.use('/api/executions', executionRouter);
app.use('/api/credentials', credentialRouter);
app.use('/api/profiles', profileRouter);
app.use('/api/schedules', scheduleRouter);
app.use('/api/recorder', recorderRouter);
app.use('/api/templates', templateRouter);
app.use('/api/stats', statsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FlowPilot Engine',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve frontend in production build if present
const clientDistPath = path.resolve('./dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/screenshots') || req.path.startsWith('/downloads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start listening
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 FlowPilot Backend running at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket streaming on ws://localhost:${PORT}/ws`);
  console.log(`📂 Data directory: ${DATA_DIR}`);
  console.log(`=================================================`);
});
