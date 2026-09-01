import { useEffect, useState, type ReactNode } from "react";
import { Braces, Trash2, Variable } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore.js";
import { useNodeRegistryStore } from "../../store/nodeRegistryStore.js";
import { Input, Label, Select, Textarea } from "../ui/Input.js";
import { Button } from "../ui/Button.js";
import { api } from "../../lib/api.js";

const TARGET_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "testId", label: "Test ID", hint: "data-testid (highest priority)" },
  { key: "role", label: "Role", hint: "ARIA role, e.g. button, textbox" },
  { key: "name", label: "Accessible name", hint: "Used with role" },
  { key: "label", label: "Label text", hint: "Associated <label>" },
  { key: "placeholder", label: "Placeholder", hint: "" },
  { key: "text", label: "Visible text", hint: "" },
  { key: "css", label: "CSS selector", hint: "" },
  { key: "xpath", label: "XPath", hint: "Last resort" },
];

export function ConfigPanel() {
  const { selectedNodeId, nodes, updateNode, deleteNode, variables } = useWorkflowStore();
  const byType = useNodeRegistryStore((s) => s.byType);
  const [credentials, setCredentials] = useState<{ id: string; name: string }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => { api.get<any[]>("/api/credentials").then(setCredentials).catch(() => {}); }, []);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) {
    return (
      <aside className="hidden h-full w-80 shrink-0 flex-col items-center justify-center border-l border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-6 text-center lg:flex">
        <Braces className="mb-3 text-[rgb(var(--text-muted))]" size={28} />
        <p className="text-sm text-[rgb(var(--text-muted))]">Select a node to configure it.</p>
      </aside>
    );
  }

  const data = node.data.node;
  const def = byType[data.type];
  const containerNodes = nodes.filter((n) => byType[n.data.node.type]?.isContainer && n.id !== node.id);
  const parentDef = data.parentId ? byType[nodes.find((n) => n.id === data.parentId)?.data.node.type ?? ""] : undefined;

  function patch(p: Partial<typeof data>) {
    updateNode(node!.id, p);
  }

  const configEntries = Object.entries({ ...def?.defaultConfig, ...data.config });

  return (
    <aside className="hidden h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] lg:flex">
      <div className="border-b border-[rgb(var(--border))] p-4">
        <Label>Name</Label>
        <Input value={data.label ?? ""} onChange={(e) => patch({ label: e.target.value })} placeholder={def?.label} />
        <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">{def?.description}</p>
        {!def?.implemented && (
          <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-400">
            This node type is not yet supported for execution.
          </p>
        )}
      </div>

      <Section title="Configuration">
        {configEntries.length === 0 && <p className="text-xs text-[rgb(var(--text-muted))]">No configuration needed.</p>}
        {configEntries.map(([key, defaultValue]) => (
          <ConfigField
            key={key} fieldKey={key} value={data.config[key] ?? defaultValue}
            onChange={(v) => patch({ config: { ...data.config, [key]: v } })}
            variables={variables}
          />
        ))}
      </Section>

      {def?.requiresTarget && (
        <Section title="Target Element">
          <p className="mb-2 text-xs text-[rgb(var(--text-muted))]">
            Selector strategies are tried in order from top to bottom. Fill in whichever ones the recorder captured or you know about the element.
          </p>
          {TARGET_FIELDS.map((f) => (
            <div key={f.key} className="mb-2">
              <Label>{f.label}</Label>
              <Input
                value={(data.target as any)?.[f.key] ?? ""}
                onChange={(e) => patch({ target: { ...data.target, [f.key]: e.target.value || undefined } })}
                placeholder={f.hint}
              />
            </div>
          ))}
        </Section>
      )}

      {(def?.supportsCredential || data.type === "form.password") && (
        <Section title="Credential">
          <Select value={data.credentialId ?? ""} onChange={(e) => patch({ credentialId: e.target.value || undefined })}>
            <option value="">None — use configured value</option>
            {credentials.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Section>
      )}

      <Section title="Container">
        <Label>Parent container</Label>
        <Select
          value={data.parentId ?? ""}
          onChange={(e) => patch({ parentId: e.target.value || null, branch: undefined })}
        >
          <option value="">None — top level</option>
          {containerNodes.map((c) => <option key={c.id} value={c.id}>{c.data.node.label || c.data.node.type}</option>)}
        </Select>
        {data.parentId && (
          <div className="mt-2">
            <Label>Branch</Label>
            <Select value={data.branch ?? ""} onChange={(e) => patch({ branch: e.target.value })}>
              <option value="">Select a branch...</option>
              {(byType[nodes.find((n) => n.id === data.parentId)?.data.node.type ?? ""]?.outputs ?? [])
                .filter((o) => o.id !== "done")
                .map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
          </div>
        )}
      </Section>

      <Section title="Timeout & Retry">
        <Label>Timeout (ms)</Label>
        <Input type="number" value={data.timeout ?? ""} onChange={(e) => patch({ timeout: e.target.value ? Number(e.target.value) : undefined })} placeholder="30000" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <Label>Retry attempts</Label>
            <Input type="number" min={1} value={data.retry?.maxAttempts ?? 1} onChange={(e) => patch({ retry: { maxAttempts: Number(e.target.value) || 1, delayMs: data.retry?.delayMs ?? 1000 } })} />
          </div>
          <div>
            <Label>Retry delay (ms)</Label>
            <Input type="number" min={0} value={data.retry?.delayMs ?? 1000} onChange={(e) => patch({ retry: { maxAttempts: data.retry?.maxAttempts ?? 1, delayMs: Number(e.target.value) || 0 } })} />
          </div>
        </div>
      </Section>

      <Section title="Error Handling">
        <Label>On error</Label>
        <Select
          value={data.errorHandling?.onError ?? "stop"}
          onChange={(e) => patch({ errorHandling: { onError: e.target.value as any, screenshotOnError: data.errorHandling?.screenshotOnError ?? true, capturePageHtml: data.errorHandling?.capturePageHtml ?? false } })}
        >
          <option value="stop">Stop workflow</option>
          <option value="continue">Continue to next node</option>
        </Select>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={data.errorHandling?.screenshotOnError ?? true} onChange={(e) => patch({ errorHandling: { onError: data.errorHandling?.onError ?? "stop", screenshotOnError: e.target.checked, capturePageHtml: data.errorHandling?.capturePageHtml ?? false } })} />
          Capture screenshot on error
        </label>
      </Section>

      <Section title="Advanced">
        <button onClick={() => setShowAdvanced((v) => !v)} className="text-xs font-medium text-brand-500">
          {showAdvanced ? "Hide" : "Show"} raw node JSON
        </button>
        {showAdvanced && (
          <Textarea
            className="mt-2 font-mono text-xs" rows={10}
            value={JSON.stringify(data, null, 2)}
            onChange={(e) => {
              try { patch(JSON.parse(e.target.value)); } catch { /* invalid JSON while typing — ignore */ }
            }}
          />
        )}
      </Section>

      <div className="p-4">
        <Button variant="danger" size="sm" className="w-full" onClick={() => deleteNode(node!.id)}>
          <Trash2 size={14} /> Delete node
        </Button>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-[rgb(var(--border))] p-4">
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">{title}</h3>
      {children}
    </div>
  );
}

function ConfigField({ fieldKey, value, onChange, variables }: { fieldKey: string; value: unknown; onChange: (v: unknown) => void; variables: { name: string }[] }) {
  const [showVars, setShowVars] = useState(false);
  const type = typeof value;

  if (type === "boolean") {
    return (
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value as boolean} onChange={(e) => onChange(e.target.checked)} />
        {humanize(fieldKey)}
      </label>
    );
  }
  if (type === "number") {
    return (
      <div className="mb-2">
        <Label>{humanize(fieldKey)}</Label>
        <Input type="number" value={value as number} onChange={(e) => onChange(Number(e.target.value))} />
      </div>
    );
  }
  if (Array.isArray(value) || (type === "object" && value !== null)) {
    return (
      <div className="mb-2">
        <Label>{humanize(fieldKey)} (JSON)</Label>
        <Textarea
          className="font-mono text-xs" rows={3} value={JSON.stringify(value, null, 2)}
          onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { /* ignore while typing */ } }}
        />
      </div>
    );
  }
  return (
    <div className="relative mb-2">
      <div className="flex items-center justify-between">
        <Label className="mb-1">{humanize(fieldKey)}</Label>
        {variables.length > 0 && (
          <button type="button" onClick={() => setShowVars((v) => !v)} className="mb-1 text-[rgb(var(--text-muted))] hover:text-brand-500" title="Insert variable">
            <Variable size={13} />
          </button>
        )}
      </div>
      <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      {showVars && (
        <div className="absolute right-0 top-6 z-10 w-48 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-1.5 shadow-lg">
          {variables.map((v) => (
            <button
              key={v.name} type="button"
              onClick={() => { onChange(`${(value as string) ?? ""}{{${v.name}}}`); setShowVars(false); }}
              className="block w-full truncate rounded-md px-2 py-1 text-left text-xs hover:bg-black/5 dark:hover:bg-white/10"
            >
              {"{{" + v.name + "}}"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function humanize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
