import { db } from '../db/database.js';
import { encrypt, decrypt } from './cryptoService.js';
import { v4 as uuidv4 } from 'uuid';

export interface CredentialRecord {
  id: string;
  name: string;
  type: 'login' | 'api_key' | 'secret' | 'payment';
  username_or_key: string | null;
  encrypted_secret: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface SanitizedCredential {
  id: string;
  name: string;
  type: string;
  username_or_key: string | null;
  masked_secret: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class CredentialService {
  public list(): SanitizedCredential[] {
    const rows = db.prepare(`SELECT * FROM credentials ORDER BY created_at DESC`).all() as CredentialRecord[];
    return rows.map(r => this.sanitize(r));
  }

  public getById(id: string): SanitizedCredential | null {
    const row = db.prepare(`SELECT * FROM credentials WHERE id = ?`).get(id) as CredentialRecord | undefined;
    return row ? this.sanitize(row) : null;
  }

  public getDecryptedCredential(id: string): { id: string; name: string; type: string; username_or_key: string | null; secret: string; metadata: Record<string, any> } | null {
    const row = db.prepare(`SELECT * FROM credentials WHERE id = ?`).get(id) as CredentialRecord | undefined;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      username_or_key: row.username_or_key,
      secret: decrypt(row.encrypted_secret),
      metadata: JSON.parse(row.metadata_json || '{}')
    };
  }

  public create(data: { name: string; type: 'login' | 'api_key' | 'secret' | 'payment'; username_or_key?: string; secret: string; metadata?: Record<string, any> }): SanitizedCredential {
    const id = `cred_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const encryptedSecret = encrypt(data.secret || '');
    const metaJson = JSON.stringify(data.metadata || {});

    db.prepare(`
      INSERT INTO credentials (id, name, type, username_or_key, encrypted_secret, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.type, data.username_or_key || null, encryptedSecret, metaJson, now, now);

    return this.getById(id)!;
  }

  public update(id: string, data: { name?: string; username_or_key?: string; secret?: string; metadata?: Record<string, any> }): SanitizedCredential | null {
    const existing = db.prepare(`SELECT * FROM credentials WHERE id = ?`).get(id) as CredentialRecord | undefined;
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = data.name !== undefined ? data.name : existing.name;
    const username_or_key = data.username_or_key !== undefined ? data.username_or_key : existing.username_or_key;
    const encryptedSecret = data.secret ? encrypt(data.secret) : existing.encrypted_secret;
    const metaJson = data.metadata ? JSON.stringify(data.metadata) : existing.metadata_json;

    db.prepare(`
      UPDATE credentials
      SET name = ?, username_or_key = ?, encrypted_secret = ?, metadata_json = ?, updated_at = ?
      WHERE id = ?
    `).run(name, username_or_key, encryptedSecret, metaJson, now, id);

    return this.getById(id);
  }

  public delete(id: string): boolean {
    const res = db.prepare(`DELETE FROM credentials WHERE id = ?`).run(id);
    return res.changes > 0;
  }

  private sanitize(r: CredentialRecord): SanitizedCredential {
    let metadata: Record<string, any> = {};
    try {
      metadata = JSON.parse(r.metadata_json || '{}');
    } catch {}

    return {
      id: r.id,
      name: r.name,
      type: r.type,
      username_or_key: r.username_or_key,
      masked_secret: '••••••••••••',
      metadata,
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  }
}

export const credentialService = new CredentialService();
