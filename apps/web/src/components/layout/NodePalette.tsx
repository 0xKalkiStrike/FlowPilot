import { useState } from "react";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useNodeRegistryStore } from "../../store/nodeRegistryStore.js";
import { DynamicIcon } from "../../lib/icon.js";

const CATEGORY_LABELS: Record<string, string> = {
  triggers: "Triggers", browser: "Browser", interaction: "Interaction", forms: "Forms",
  logic: "Logic", data: "Data", files: "Files", services: "Services", utilities: "Utilities",
};
const CATEGORY_ORDER = ["triggers", "browser", "interaction", "forms", "logic", "data", "files", "services", "utilities"];

export function NodePalette() {
  const byCategory = useNodeRegistryStore((s) => s.byCategory);
  const [open, setOpen] = useState<Record<string, boolean>>({ triggers: true, browser: true, interaction: true, forms: true });
  const [filter, setFilter] = useState("");

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] md:flex">
      <div className="p-3">
        <input
          value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search nodes..."
          className="w-full rounded-lg border border-[rgb(var(--border))] bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[rgb(var(--ring))]"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {CATEGORY_ORDER.filter((c) => byCategory[c]?.length).map((category) => {
          const defs = (byCategory[category] ?? []).filter((d) => !filter || d.label.toLowerCase().includes(filter.toLowerCase()));
          if (defs.length === 0) return null;
          const isOpen = open[category] ?? !!filter;
          return (
            <div key={category} className="mb-1">
              <button
                onClick={() => setOpen((s) => ({ ...s, [category]: !isOpen }))}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))] hover:bg-black/5 dark:hover:bg-white/5"
              >
                <ChevronRight size={13} className={clsx("transition-transform", isOpen && "rotate-90")} />
                {CATEGORY_LABELS[category] ?? category}
                <span className="ml-auto font-normal normal-case">{defs.length}</span>
              </button>
              {isOpen && (
                <div className="mt-0.5 space-y-0.5 pb-1 pl-1">
                  {defs.map((def) => (
                    <div
                      key={def.type}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("application/flowpilot-node-type", def.type)}
                      title={def.description}
                      className="flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/5 active:cursor-grabbing dark:hover:bg-white/5"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/5 dark:bg-white/10">
                        <DynamicIcon name={def.icon} size={13} />
                      </div>
                      <span className="truncate">{def.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
