import { useEffect, useState } from "react";
import { KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../lib/api.js";
import { Card, EmptyState, Badge } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { Dialog } from "../components/ui/Dialog.js";
import { Input, Label, Select } from "../components/ui/Input.js";
import { toast } from "../store/toastStore.js";

interface CredentialSummary { id: string; name: string; type: string; fieldNames: string[] }

const FIELD_PRESETS: Record<string, string[]> = {
  username_password: ["username", "password"],
  email_password: ["email", "password"],
  api_key: ["apiKey"],
  token: ["token"],
  cookie_session: ["cookie"],
  custom: [],
};

export default function Credentials() {
  const [credentials, setCredentials] = useState<CredentialSummary[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("username_password");
  const [fields, setFields] = useState<Record<string, string>>({ username: "", password: "" });

  async function load() { setCredentials(await api.get<CredentialSummary[]>("/api/credentials")); }
  useEffect(() => { load(); }, []);

  function onTypeChange(t: string) {
    setType(t);
    const preset = FIELD_PRESETS[t] ?? [];
    setFields(Object.fromEntries(preset.map((f) => [f, ""])));
  }

  async function submit() {
    try {
      await api.post("/api/credentials", { name, type, fields });
      toast.success("Credential saved securely");
      setOpen(false);
      setName("");
      onTypeChange("username_password");
      load();
    } catch (err: any) {
      toast.error("Could not save credential", err.message ?? String(err));
    }
  }

  async function test(id: string) {
    try {
      await api.post(`/api/credentials/${id}/test`);
      toast.success("Credential is readable and decrypts correctly");
    } catch (err: any) {
      toast.error("Credential test failed", err.message ?? String(err));
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this credential?")) return;
    await api.delete(`/api/credentials/${id}`);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Credentials</h1>
          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Encrypted at rest. Never required for ordinary browser automation — only attach one where a workflow needs it.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={15} /> Add Credential</Button>
      </div>

      {credentials && credentials.length === 0 && (
        <EmptyState icon={<KeyRound size={32} />} title="No credentials yet" description="Add a credential only when a specific workflow needs one — most browser automations don't." action={<Button onClick={() => setOpen(true)}><Plus size={15} /> Add Credential</Button>} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {(credentials ?? []).map((c) => (
          <Card key={c.id} className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{c.name}</p>
              <Badge className="mt-1">{c.type.replace(/_/g, " ")}</Badge>
            </div>
            <div className="flex gap-1">
              <button onClick={() => test(c.id)} className="rounded-md p-1.5 text-[rgb(var(--text-muted))] hover:bg-black/5 dark:hover:bg-white/10" title="Test"><ShieldCheck size={15} /></button>
              <button onClick={() => remove(c.id)} className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10" title="Delete"><Trash2 size={15} /></button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Add Credential">
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Store Admin Login" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => onTypeChange(e.target.value)}>
              <option value="username_password">Username / Password</option>
              <option value="email_password">Email / Password</option>
              <option value="api_key">API Key</option>
              <option value="token">Token</option>
              <option value="cookie_session">Cookie / Session</option>
              <option value="custom">Custom</option>
            </Select>
          </div>
          {Object.keys(fields).map((f) => (
            <div key={f}>
              <Label>{f}</Label>
              <Input type={f.toLowerCase().includes("password") ? "password" : "text"} value={fields[f]} onChange={(e) => setFields({ ...fields, [f]: e.target.value })} />
            </div>
          ))}
          <Button className="w-full" onClick={submit} disabled={!name}>Save Credential</Button>
        </div>
      </Dialog>
    </div>
  );
}
