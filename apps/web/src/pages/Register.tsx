import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Workflow as WorkflowIcon } from "lucide-react";
import { Button } from "../components/ui/Button.js";
import { Input, Label } from "../components/ui/Input.js";
import { useAuthStore } from "../store/authStore.js";
import { toast } from "../store/toastStore.js";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err: any) {
      toast.error("Registration failed", err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--bg))] px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white"><WorkflowIcon size={22} /></div>
          <h1 className="text-xl font-semibold">Create your FlowPilot account</h1>
          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">A workspace is created automatically for you.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-6 shadow-sm">
          <div>
            <Label>Full name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</Button>
          <p className="text-center text-xs text-[rgb(var(--text-muted))]">
            Already have an account? <Link to="/login" className="font-medium text-brand-500">Sign in</Link>.
          </p>
        </form>
      </div>
    </div>
  );
}
