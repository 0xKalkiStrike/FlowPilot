/**
 * Resolves `{{variableName}}` placeholders in a string against a flat
 * variable map. Supports simple dotted paths (e.g. {{user.email}}) and
 * leaves unresolvable placeholders intact so failures are visible rather
 * than silently producing "undefined".
 */
export function resolveTemplate(input: string, variables: Record<string, unknown>): string {
  if (typeof input !== "string") return input;
  return input.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    const value = getByPath(variables, path);
    if (value === undefined) return match;
    return typeof value === "string" ? value : JSON.stringify(value);
  });
}

export function resolveDeep<T>(input: T, variables: Record<string, unknown>): T {
  if (typeof input === "string") return resolveTemplate(input, variables) as unknown as T;
  if (Array.isArray(input)) return input.map((v) => resolveDeep(v, variables)) as unknown as T;
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = resolveDeep(v, variables);
    }
    return out as T;
  }
  return input;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function extractVariableNames(input: string): string[] {
  const names = new Set<string>();
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) names.add(m[1]);
  return [...names];
}
