const SENSITIVE_KEYS = new Set([
  "password", "secret", "token", "apikey", "api_key", "cookie", "cookies",
  "authorization", "cvv", "cardnumber", "card_number", "credential", "credentials",
]);

/** Deep-clones an object, replacing values under sensitive keys with "***REDACTED***". */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "***REDACTED***" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export type LogLevel = "debug" | "info" | "warn" | "error";
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function createLogger(scope: string, minLevel: LogLevel = "info") {
  function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    const entry = {
      time: new Date().toISOString(),
      level,
      scope,
      message,
      ...(meta ? { meta: redact(meta) } : {}),
    };
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
  return {
    debug: (m: string, meta?: Record<string, unknown>) => log("debug", m, meta),
    info: (m: string, meta?: Record<string, unknown>) => log("info", m, meta),
    warn: (m: string, meta?: Record<string, unknown>) => log("warn", m, meta),
    error: (m: string, meta?: Record<string, unknown>) => log("error", m, meta),
  };
}
export type Logger = ReturnType<typeof createLogger>;
