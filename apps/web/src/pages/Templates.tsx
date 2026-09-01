import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutTemplate } from "lucide-react";
import { api } from "../lib/api.js";
import { Card, Badge, EmptyState } from "../components/ui/Card.js";
import { Button } from "../components/ui/Button.js";
import { toast } from "../store/toastStore.js";

interface TemplateSummary { id: string; name: string; description: string; category: string; isBuiltIn: boolean }

export default function Templates() {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => { api.get<TemplateSummary[]>("/api/templates").then(setTemplates); }, []);

  async function use(id: string) {
    try {
      const res = await api.post<{ id: string }>(`/api/templates/${id}/use`);
      toast.success("Workflow created from template");
      navigate(`/workflows/${res.id}`);
    } catch (err: any) {
      toast.error("Could not use template", err.message ?? String(err));
    }
  }

  const categories = Array.from(new Set((templates ?? []).map((t) => t.category)));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Start from a ready-made automation and customize it.</p>
      </div>

      {templates && templates.length === 0 && (
        <EmptyState icon={<LayoutTemplate size={32} />} title="No templates available" description="Templates will appear here once seeded." />
      )}

      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="mb-3 text-sm font-semibold text-[rgb(var(--text-muted))]">{cat}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(templates ?? []).filter((t) => t.category === cat).map((t) => (
              <Card key={t.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between">
                  <p className="font-medium">{t.name}</p>
                  {t.isBuiltIn && <Badge variant="info">Built-in</Badge>}
                </div>
                <p className="mt-1.5 flex-1 text-xs text-[rgb(var(--text-muted))]">{t.description}</p>
                <Button size="sm" className="mt-4" onClick={() => use(t.id)}>Use Template</Button>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
