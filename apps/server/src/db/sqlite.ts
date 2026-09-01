import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * `node:sqlite` is loaded via `require()` rather than a static `import`
 * on purpose. It's a very new, still-experimental Node built-in that some
 * toolchains in this monorepo (namely vitest's bundled vite-node, used to
 * run these files directly from TypeScript source in tests) don't yet
 * recognize in their hardcoded built-in-module lists — a static `import`
 * would get its "node:" prefix stripped by that tooling and fail trying to
 * resolve a nonexistent package literally named "sqlite". A `require()`
 * call is opaque to that static analysis and resolves natively at runtime
 * instead, which works everywhere: `tsx` (dev), `node dist/...` (prod),
 * and vitest (tests) alike. The type-only import above is erased at build
 * time and never reaches the runtime resolver, so it's unaffected.
 */
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: typeof DatabaseSyncType };
type DatabaseSync = DatabaseSyncType;

/**
 * FlowPilot's data layer, built directly on Node's built-in `node:sqlite`
 * module rather than an ORM with a native/downloaded query engine binary.
 * This is a deliberate portability choice: it has zero native dependencies
 * beyond Node itself, so `npm install` never needs network access to a
 * binary CDN — it works identically on a locked-down corporate network, an
 * offline machine, or a fresh laptop. `prisma/schema.prisma` at the repo
 * root remains the canonical, human-readable description of this same data
 * model (and the path to swap in PostgreSQL later); the tables and columns
 * below are kept in exact sync with it by hand.
 *
 * The query surface implemented here (findMany/findFirst/findUnique/
 * findUniqueOrThrow/create/update/delete/deleteMany/count, with where/OR/
 * contains/orderBy/take/include) is intentionally narrow — it covers
 * exactly the query shapes this application's routes use, not a general
 * SQL query builder. Given this app's local, single-workspace-per-user
 * scale, each read loads a table's rows into memory and filters in
 * JavaScript rather than compiling dynamic SQL — simple to verify correct,
 * and fast enough for the data volumes involved (thousands, not millions,
 * of rows per workspace).
 */

export interface ModelConfig {
  table: string;
  columns: string[];
  booleanFields?: string[];
  dateFields?: string[];
  defaults?: Record<string, () => unknown>;
  autoUpdatedAt?: boolean;
  relations?: Record<string, { model: string; localField: string }>;
}

type Row = Record<string, any>;

export class NotFoundError extends Error {
  constructor(table: string) {
    super(`No ${table} row found matching the given query.`);
  }
}

export class Model<T extends Row = Row> {
  constructor(private db: DatabaseSync, private cfg: ModelConfig, private registry: () => Record<string, Model>) {}

  private allRaw(): Row[] {
    return this.db.prepare(`SELECT * FROM ${this.cfg.table}`).all() as Row[];
  }

  private deserialize(row: Row | undefined): T | undefined {
    if (!row) return undefined;
    const out: Row = { ...row };
    for (const f of this.cfg.booleanFields ?? []) if (f in out) out[f] = !!out[f];
    for (const f of this.cfg.dateFields ?? []) if (out[f] != null) out[f] = new Date(out[f] as string);
    return out as T;
  }

  private serializeForStorage(key: string, value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value === undefined) return null;
    return value;
  }

  private matchesOne(row: Row, cond: Record<string, unknown>): boolean {
    for (const [key, val] of Object.entries(cond)) {
      if (key === "OR") {
        if (!(val as Record<string, unknown>[]).some((sub) => this.matchesOne(row, sub))) return false;
        continue;
      }
      if (key === "AND") {
        if (!(val as Record<string, unknown>[]).every((sub) => this.matchesOne(row, sub))) return false;
        continue;
      }
      if (val && typeof val === "object" && !(val instanceof Date)) {
        const obj = val as Record<string, unknown>;
        if ("contains" in obj) {
          const haystack = String(row[key] ?? "").toLowerCase();
          if (!haystack.includes(String(obj.contains).toLowerCase())) return false;
          continue;
        }
        // A composite-key object (e.g. { workflowId, version }) — every
        // sub-field must match the row directly.
        let ok = true;
        for (const [subKey, subVal] of Object.entries(obj)) {
          if (row[subKey] !== normalizeCompare(subVal)) { ok = false; break; }
        }
        if (!ok) return false;
        continue;
      }
      if (row[key] !== normalizeCompare(val)) return false;
    }
    return true;
  }

  private filter(where?: Record<string, unknown>): Row[] {
    const rows = this.allRaw();
    if (!where) return rows;
    return rows.filter((r) => this.matchesOne(r, where));
  }

  private sort(rows: Row[], orderBy?: Record<string, string> | Record<string, string>[]): Row[] {
    if (!orderBy) return rows;
    const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((a, b) => {
      for (const clause of clauses) {
        const [field, dir] = Object.entries(clause)[0] as [string, string];
        const av = a[field]; const bv = b[field];
        if (av === bv) continue;
        const cmp = av > bv ? 1 : -1;
        return dir === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  }

  private attachIncludes(row: T | undefined, include?: Record<string, unknown>): T | undefined {
    if (!row || !include) return row;
    const out: Row = { ...row };
    for (const [relName, spec] of Object.entries(include)) {
      const rel = this.cfg.relations?.[relName];
      if (!rel) continue;
      const relatedModel = this.registry()[rel.model];
      const related = relatedModel?.findByIdRaw((row as Row)[rel.localField]);
      if (!related) { out[relName] = null; continue; }
      if (spec && typeof spec === "object" && "select" in (spec as any)) {
        const picked: Row = {};
        for (const k of Object.keys((spec as any).select)) picked[k] = related[k];
        out[relName] = picked;
      } else {
        out[relName] = related;
      }
    }
    return out as T;
  }

  findByIdRaw(id: unknown): T | undefined {
    return this.deserialize(this.allRaw().find((r) => r.id === id));
  }

  async findMany(args: { where?: Record<string, unknown>; orderBy?: any; take?: number; include?: Record<string, unknown> } = {}): Promise<T[]> {
    let rows = this.filter(args.where);
    rows = this.sort(rows, args.orderBy);
    if (args.take) rows = rows.slice(0, args.take);
    return rows.map((r) => this.attachIncludes(this.deserialize(r), args.include)!) as T[];
  }

  async findFirst(args: { where?: Record<string, unknown>; include?: Record<string, unknown> } = {}): Promise<T | null> {
    const rows = this.filter(args.where);
    const row = this.deserialize(rows[0]);
    return (this.attachIncludes(row, args.include) ?? null) as T | null;
  }

  async findUnique(args: { where: Record<string, unknown>; include?: Record<string, unknown> }): Promise<T | null> {
    const rows = this.filter(args.where);
    const row = this.deserialize(rows[0]);
    return (this.attachIncludes(row, args.include) ?? null) as T | null;
  }

  async findUniqueOrThrow(args: { where: Record<string, unknown> }): Promise<T> {
    const row = await this.findUnique(args);
    if (!row) throw new NotFoundError(this.cfg.table);
    return row;
  }

  async count(args: { where?: Record<string, unknown> } = {}): Promise<number> {
    return this.filter(args.where).length;
  }

  async create(args: { data: Row }): Promise<T> {
    const data: Row = { ...args.data };
    for (const [key, fn] of Object.entries(this.cfg.defaults ?? {})) {
      if (data[key] === undefined) data[key] = fn();
    }
    const cols = this.cfg.columns;
    const placeholders = cols.map(() => "?").join(",");
    const values = cols.map((c) => this.serializeForStorage(c, data[c])) as (string | number | bigint | Uint8Array | null)[];
    this.db.prepare(`INSERT INTO ${this.cfg.table} (${cols.join(",")}) VALUES (${placeholders})`).run(...values);
    return this.deserialize(data) as T;
  }

  async update(args: { where: { id: string } | Record<string, unknown>; data: Row }): Promise<T> {
    const existing = this.allRaw().find((r) => this.matchesOne(r, args.where as Record<string, unknown>));
    if (!existing) throw new NotFoundError(this.cfg.table);
    const merged: Row = { ...existing };
    for (const [key, value] of Object.entries(args.data)) {
      if (value === undefined) continue; // Prisma semantics: omitted fields are left untouched.
      merged[key] = value;
    }
    if (this.cfg.autoUpdatedAt) merged.updatedAt = new Date().toISOString();
    const cols = this.cfg.columns;
    const setClause = cols.filter((c) => c !== "id").map((c) => `${c} = ?`).join(", ");
    const values = cols.filter((c) => c !== "id").map((c) => this.serializeForStorage(c, merged[c])) as (string | number | bigint | Uint8Array | null)[];
    this.db.prepare(`UPDATE ${this.cfg.table} SET ${setClause} WHERE id = ?`).run(...values, existing.id as string);
    return this.deserialize(merged) as T;
  }

  async delete(args: { where: { id: string } | Record<string, unknown> }): Promise<T> {
    const existing = this.allRaw().find((r) => this.matchesOne(r, args.where as Record<string, unknown>));
    if (!existing) throw new NotFoundError(this.cfg.table);
    this.db.prepare(`DELETE FROM ${this.cfg.table} WHERE id = ?`).run(existing.id);
    return this.deserialize(existing) as T;
  }

  async deleteMany(args: { where?: Record<string, unknown> } = {}): Promise<{ count: number }> {
    const rows = this.filter(args.where);
    for (const row of rows) this.db.prepare(`DELETE FROM ${this.cfg.table} WHERE id = ?`).run(row.id);
    return { count: rows.length };
  }
}

function normalizeCompare(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

const TABLE_DDL: Record<string, string> = {
  users: `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, passwordSalt TEXT NOT NULL,
    name TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  )`,
  workspaces: `CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, ownerId TEXT NOT NULL, createdAt TEXT NOT NULL
  )`,
  workflows: `CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY, workspaceId TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    schemaVersion TEXT NOT NULL DEFAULT '1.0', triggerType TEXT NOT NULL DEFAULT 'manual',
    triggerConfig TEXT NOT NULL DEFAULT '{}', variables TEXT NOT NULL DEFAULT '[]', nodes TEXT NOT NULL DEFAULT '[]',
    edges TEXT NOT NULL DEFAULT '[]', browserConfig TEXT NOT NULL DEFAULT '{}', isActive INTEGER NOT NULL DEFAULT 1,
    currentVersion INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  )`,
  workflow_versions: `CREATE TABLE IF NOT EXISTS workflow_versions (
    id TEXT PRIMARY KEY, workflowId TEXT NOT NULL, version INTEGER NOT NULL, label TEXT NOT NULL DEFAULT '',
    snapshot TEXT NOT NULL, createdAt TEXT NOT NULL, UNIQUE(workflowId, version)
  )`,
  credentials: `CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY, workspaceId TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL,
    encryptedSecret TEXT NOT NULL, fieldNames TEXT NOT NULL DEFAULT '[]', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  )`,
  browser_profiles: `CREATE TABLE IF NOT EXISTS browser_profiles (
    id TEXT PRIMARY KEY, workspaceId TEXT NOT NULL, name TEXT NOT NULL, dirName TEXT UNIQUE NOT NULL,
    createdAt TEXT NOT NULL, lastUsedAt TEXT
  )`,
  executions: `CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY, workflowId TEXT NOT NULL, workspaceId TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'QUEUED',
    triggeredBy TEXT NOT NULL DEFAULT 'manual', startedAt TEXT NOT NULL, finishedAt TEXT, durationMs INTEGER,
    error TEXT, currentNodeId TEXT, variablesSnapshot TEXT NOT NULL DEFAULT '{}'
  )`,
  execution_logs: `CREATE TABLE IF NOT EXISTS execution_logs (
    id TEXT PRIMARY KEY, executionId TEXT NOT NULL, nodeId TEXT, nodeLabel TEXT, level TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL, status TEXT, data TEXT, timestamp TEXT NOT NULL
  )`,
  schedules: `CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY, workflowId TEXT NOT NULL, workspaceId TEXT NOT NULL, frequency TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '09:00', timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata', daysOfWeek TEXT NOT NULL DEFAULT '[]',
    dayOfMonth INTEGER, intervalMinutes INTEGER, cron TEXT, runOnceAt TEXT, enabled INTEGER NOT NULL DEFAULT 1,
    nextRunAt TEXT, lastRunAt TEXT, lastRunStatus TEXT, createdAt TEXT NOT NULL
  )`,
  templates: `CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY, workspaceId TEXT, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general', workflowJson TEXT NOT NULL, isBuiltIn INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )`,
  file_records: `CREATE TABLE IF NOT EXISTS file_records (
    id TEXT PRIMARY KEY, workspaceId TEXT NOT NULL, executionId TEXT, kind TEXT NOT NULL, fileName TEXT NOT NULL,
    filePath TEXT NOT NULL, sizeBytes INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
  )`,
  variables: `CREATE TABLE IF NOT EXISTS variables (
    id TEXT PRIMARY KEY, workspaceId TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'string',
    defaultValue TEXT, sensitive INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, UNIQUE(workspaceId, name)
  )`,
  connectors: `CREATE TABLE IF NOT EXISTS connectors (
    id TEXT PRIMARY KEY, workspaceId TEXT NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}', credentialId TEXT, createdAt TEXT NOT NULL
  )`,
};

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  user: { table: "users", columns: ["id", "email", "passwordHash", "passwordSalt", "name", "createdAt", "updatedAt"], dateFields: ["createdAt", "updatedAt"], autoUpdatedAt: true, defaults: { createdAt: () => new Date().toISOString(), updatedAt: () => new Date().toISOString() } },
  workspace: { table: "workspaces", columns: ["id", "name", "ownerId", "createdAt"], dateFields: ["createdAt"], defaults: { createdAt: () => new Date().toISOString() } },
  workflow: {
    table: "workflows",
    columns: ["id", "workspaceId", "name", "description", "schemaVersion", "triggerType", "triggerConfig", "variables", "nodes", "edges", "browserConfig", "isActive", "currentVersion", "createdAt", "updatedAt"],
    booleanFields: ["isActive"], dateFields: ["createdAt", "updatedAt"], autoUpdatedAt: true,
    defaults: {
      description: () => "", schemaVersion: () => "1.0", triggerType: () => "manual", triggerConfig: () => "{}",
      variables: () => "[]", nodes: () => "[]", edges: () => "[]", browserConfig: () => "{}", isActive: () => true,
      currentVersion: () => 1, createdAt: () => new Date().toISOString(), updatedAt: () => new Date().toISOString(),
    },
    relations: {},
  },
  workflowVersion: { table: "workflow_versions", columns: ["id", "workflowId", "version", "label", "snapshot", "createdAt"], dateFields: ["createdAt"], defaults: { label: () => "", createdAt: () => new Date().toISOString() } },
  credential: { table: "credentials", columns: ["id", "workspaceId", "name", "type", "encryptedSecret", "fieldNames", "createdAt", "updatedAt"], dateFields: ["createdAt", "updatedAt"], autoUpdatedAt: true, defaults: { fieldNames: () => "[]", createdAt: () => new Date().toISOString(), updatedAt: () => new Date().toISOString() } },
  browserProfile: { table: "browser_profiles", columns: ["id", "workspaceId", "name", "dirName", "createdAt", "lastUsedAt"], dateFields: ["createdAt", "lastUsedAt"], defaults: { createdAt: () => new Date().toISOString() } },
  execution: {
    table: "executions",
    columns: ["id", "workflowId", "workspaceId", "status", "triggeredBy", "startedAt", "finishedAt", "durationMs", "error", "currentNodeId", "variablesSnapshot"],
    dateFields: ["startedAt", "finishedAt"],
    defaults: { status: () => "QUEUED", triggeredBy: () => "manual", startedAt: () => new Date().toISOString(), variablesSnapshot: () => "{}" },
    relations: { workflow: { model: "workflow", localField: "workflowId" } },
  },
  executionLog: { table: "execution_logs", columns: ["id", "executionId", "nodeId", "nodeLabel", "level", "message", "status", "data", "timestamp"], dateFields: ["timestamp"], defaults: { level: () => "info", timestamp: () => new Date().toISOString() } },
  schedule: {
    table: "schedules",
    columns: ["id", "workflowId", "workspaceId", "frequency", "time", "timezone", "daysOfWeek", "dayOfMonth", "intervalMinutes", "cron", "runOnceAt", "enabled", "nextRunAt", "lastRunAt", "lastRunStatus", "createdAt"],
    booleanFields: ["enabled"], dateFields: ["runOnceAt", "nextRunAt", "lastRunAt", "createdAt"],
    defaults: { time: () => "09:00", timezone: () => "Asia/Kolkata", daysOfWeek: () => "[]", enabled: () => true, createdAt: () => new Date().toISOString() },
    relations: { workflow: { model: "workflow", localField: "workflowId" } },
  },
  template: { table: "templates", columns: ["id", "workspaceId", "name", "description", "category", "workflowJson", "isBuiltIn", "createdAt"], booleanFields: ["isBuiltIn"], dateFields: ["createdAt"], defaults: { description: () => "", category: () => "general", isBuiltIn: () => false, createdAt: () => new Date().toISOString() } },
  fileRecord: { table: "file_records", columns: ["id", "workspaceId", "executionId", "kind", "fileName", "filePath", "sizeBytes", "createdAt"], dateFields: ["createdAt"], defaults: { sizeBytes: () => 0, createdAt: () => new Date().toISOString() } },
  variable: { table: "variables", columns: ["id", "workspaceId", "name", "type", "defaultValue", "sensitive", "createdAt"], booleanFields: ["sensitive"], dateFields: ["createdAt"], defaults: { type: () => "string", sensitive: () => false, createdAt: () => new Date().toISOString() } },
  connector: { table: "connectors", columns: ["id", "workspaceId", "type", "name", "config", "credentialId", "createdAt"], dateFields: ["createdAt"], defaults: { config: () => "{}", createdAt: () => new Date().toISOString() } },
};

export type Db = Record<keyof typeof MODEL_CONFIGS, Model<any>>;

export function createDb(dbFilePath: string): Db {
  fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
  const sqlite = new DatabaseSync(dbFilePath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const ddl of Object.values(TABLE_DDL)) sqlite.exec(ddl);

  const models: Record<string, Model> = {};
  const registry = () => models;
  for (const [name, cfg] of Object.entries(MODEL_CONFIGS)) {
    models[name] = new Model(sqlite, cfg, registry);
  }
  return models as Db;
}
