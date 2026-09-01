import Database from 'better-sqlite3';
import { DB_PATH } from '../config.js';
import { v4 as uuidv4 } from 'uuid';

export const db = new Database(DB_PATH);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      trigger_type TEXT DEFAULT 'manual',
      nodes_json TEXT NOT NULL DEFAULT '[]',
      edges_json TEXT NOT NULL DEFAULT '[]',
      variables_json TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_versions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      workflow_name TEXT NOT NULL,
      trigger TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED, RUNNING, SUCCESS, FAILED, CANCELLED, PAUSED
      current_node_id TEXT,
      start_time TEXT,
      end_time TEXT,
      duration_ms INTEGER DEFAULT 0,
      error_message TEXT,
      logs_json TEXT NOT NULL DEFAULT '[]',
      screenshots_json TEXT NOT NULL DEFAULT '[]',
      final_variables_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'login', 'api_key', 'secret'
      username_or_key TEXT,
      encrypted_secret TEXT NOT NULL,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS browser_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      user_data_dir TEXT NOT NULL,
      cookies_json TEXT DEFAULT '[]',
      user_agent TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      name TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'daily',
      time TEXT NOT NULL DEFAULT '09:00',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      is_enabled INTEGER DEFAULT 1,
      next_run_at TEXT,
      last_run_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT NOT NULL,
      nodes_json TEXT NOT NULL,
      edges_json TEXT NOT NULL,
      variables_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Ensure default browser profile exists
  const existingDefault = db.prepare(`SELECT id FROM browser_profiles WHERE is_default = 1`).get();
  if (!existingDefault) {
    const id = 'default-profile';
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO browser_profiles (id, name, user_data_dir, is_default, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(id, 'Default Profile', 'default', now, now);
  }
}
