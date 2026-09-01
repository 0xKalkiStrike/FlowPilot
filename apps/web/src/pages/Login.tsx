import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Workflow as WorkflowIcon } from "lucide-react";
import { Button } from "../components/ui/Button.js";
import { Input, Label } from "../components/ui/Input.js";
import { useAuthStore } from "../store/authStore.js";
import { toast } from "../store/toastStore.js";

export default function Login() {
  const [email, setEmail] = useState("demo@flowpilot.local");
  const [password, setPassword] = useState("FlowPilot123!");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      toast.error("Login failed", err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--bg))] px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white"><WorkflowIcon size={22} /></div>
          <h1 className="text-xl font-semibold">Welcome back to FlowPilot</h1>
          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Build browser automations visually.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-6 shadow-sm">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          <p className="text-center text-xs text-[rgb(var(--text-muted))]">
            Demo account pre-filled — or <Link to="/register" className="font-medium text-brand-500">create your own account</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
