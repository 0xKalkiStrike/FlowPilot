import { db } from '../db/database.js';
import { PROFILES_DIR } from '../config.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface ProfileRecord {
  id: string;
  name: string;
  user_data_dir: string;
  cookies_json: string;
  user_agent: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export class ProfileService {
  public list(): ProfileRecord[] {
    return db.prepare(`SELECT * FROM browser_profiles ORDER BY is_default DESC, created_at ASC`).all() as ProfileRecord[];
  }

  public getById(id: string): ProfileRecord | null {
    const row = db.prepare(`SELECT * FROM browser_profiles WHERE id = ?`).get(id) as ProfileRecord | undefined;
    return row || null;
  }

  public getProfileDir(id: string): string {
    const profile = this.getById(id);
    const dirName = profile ? profile.user_data_dir : 'default';
    const profilePath = path.join(PROFILES_DIR, dirName);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }
    return profilePath;
  }

  public create(name: string, userAgent?: string): ProfileRecord {
    const id = `prof_${uuidv4().substring(0, 8)}`;
    const user_data_dir = id;
    const now = new Date().toISOString();

    const profilePath = path.join(PROFILES_DIR, user_data_dir);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }

    db.prepare(`
      INSERT INTO browser_profiles (id, name, user_data_dir, cookies_json, user_agent, is_default, created_at, updated_at)
      VALUES (?, ?, ?, '[]', ?, 0, ?, ?)
    `).run(id, name, user_data_dir, userAgent || null, now, now);

    return this.getById(id)!;
  }

  public clearSession(id: string): boolean {
    const profile = this.getById(id);
    if (!profile) return false;

    const profilePath = path.join(PROFILES_DIR, profile.user_data_dir);
    if (fs.existsSync(profilePath)) {
      try {
        fs.rmSync(profilePath, { recursive: true, force: true });
        fs.mkdirSync(profilePath, { recursive: true });
      } catch (e) {
        console.error('Error clearing profile directory:', e);
      }
    }
    return true;
  }

  public delete(id: string): boolean {
    const profile = this.getById(id);
    if (!profile || profile.is_default === 1) return false;

    const profilePath = path.join(PROFILES_DIR, profile.user_data_dir);
    if (fs.existsSync(profilePath)) {
      try {
        fs.rmSync(profilePath, { recursive: true, force: true });
      } catch {}
    }

    const res = db.prepare(`DELETE FROM browser_profiles WHERE id = ?`).run(id);
    return res.changes > 0;
  }
}

export const profileService = new ProfileService();
