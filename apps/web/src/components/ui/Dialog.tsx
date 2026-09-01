import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Dialog({ open, onClose, title, children, widthClass = "max-w-lg" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; widthClass?: string }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className={`relative z-10 w-full ${widthClass} rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-6 shadow-xl animate-slide-up`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[rgb(var(--text-muted))] hover:bg-black/5 dark:hover:bg-white/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
