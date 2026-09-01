import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "../../store/toastStore.js";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="animate-slide-up flex items-start gap-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-3.5 shadow-lg">
          {t.variant === "success" && <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={18} />}
          {t.variant === "error" && <XCircle className="mt-0.5 shrink-0 text-red-500" size={18} />}
          {t.variant === "default" && <Info className="mt-0.5 shrink-0 text-brand-500" size={18} />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))] break-words">{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="shrink-0 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
