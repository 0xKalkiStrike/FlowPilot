import { useEffect, useState } from "react";
import { Laptop, Plus, Trash2, LogIn as LogInIcon } from "lucide-react";
import { api } from "../lib/api.js";
import { Card } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { Input, Label } from "../components/ui/Input.js";
import { useAuthStore } from "../store/authStore.js";
import { useThemeStore } from "../store/themeStore.js";
import { toast } from "../store/toastStore.js";

interface BrowserProfile { id: string; name: string; createdAt: string; lastUsedAt: string | null; loginSessionOpen: boolean }

export default function Settings() {
  const { user, workspace } = useAuthStore();
  const { mode, setMode } = useThemeStore();
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [newProfileName, setNewProfileName] = useState("");

  async function load() { setProfiles(await api.get<BrowserProfile[]>("/api/browser-profiles")); }
  useEffect(() => { load(); }, []);

  async function createProfile() {
    if (!newProfileName) return;
    await api.post("/api/browser-profiles", { name: newProfileName });
    setNewProfileName("");
    load();
  }
  async function clearSession(id: string) {
    await api.post(`/api/browser-profiles/${id}/clear-session`);
    toast.success("Session cleared");
    load();
  }
  async function loginAgain(id: string) {
    await api.post(`/api/browser-profiles/${id}/login-session`, { url: "https://example.com" });
    toast.info("Browser opened", "Log in, then close the browser window when finished.");
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this browser profile? Its saved session will be lost.")) return;
    await api.delete(`/api/browser-profiles/${id}`);
    load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Account, appearance, and browser sessions.</p>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Account</h2>
        <p className="text-sm">{user?.name} — {user?.email}</p>
        <p className="text-sm text-[rgb(var(--text-muted))]">Workspace: {workspace?.name}</p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Appearance</h2>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${mode === m ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400" : "border-[rgb(var(--border))]"}`}>
              {m}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Browser Profiles</h2>
        </div>
        <p className="mb-3 text-xs text-[rgb(var(--text-muted))]">
          Each profile is an isolated, persistent browser session. Log in once through "Login Again", and future workflow runs using this profile stay authenticated.
        </p>
        <div className="mb-4 flex gap-2">
          <Input value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="e.g. Store Account" />
          <Button size="sm" onClick={createProfile}><Plus size={14} /> Create</Button>
        </div>
        <div className="space-y-2">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-[rgb(var(--border))] p-3">
              <div className="flex items-center gap-2">
                <Laptop size={16} className="text-[rgb(var(--text-muted))]" />
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-[rgb(var(--text-muted))]">{p.loginSessionOpen ? "Login window open" : p.lastUsedAt ? `Last used ${new Date(p.lastUsedAt).toLocaleDateString()}` : "Never used"}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => loginAgain(p.id)}><LogInIcon size={13} /> Login Again</Button>
                <Button size="sm" variant="secondary" onClick={() => clearSession(p.id)}>Clear Session</Button>
                <button onClick={() => remove(p.id)} className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {profiles.length === 0 && <p className="text-sm text-[rgb(var(--text-muted))]">No browser profiles yet.</p>}
        </div>
      </Card>
    </div>
  );
}
