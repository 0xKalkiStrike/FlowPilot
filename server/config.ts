import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export const PORT = parseInt(process.env.PORT || '3001', 10);
export const CLIENT_PORT = parseInt(process.env.CLIENT_PORT || '3000', 10);
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'flowpilot-super-secret-key-32-chars-long!';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
export const DB_PATH = path.join(DATA_DIR, 'flowpilot.db');
export const PROFILES_DIR = path.join(DATA_DIR, 'browser_profiles');
export const SCREENSHOTS_DIR = path.join(DATA_DIR, 'screenshots');
export const DOWNLOADS_DIR = path.join(DATA_DIR, 'downloads');

// Ensure essential directories exist
[DATA_DIR, PROFILES_DIR, SCREENSHOTS_DIR, DOWNLOADS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
