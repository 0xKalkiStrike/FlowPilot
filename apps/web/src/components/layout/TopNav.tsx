import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Moon, Search, Settings, Sun, Monitor, Workflow as WorkflowIcon } from "lucide-react";
import { useAuthStore } from "../../store/authStore.js";
import { useThemeStore } from "../../store/themeStore.js";
import { api } from "../../lib/api.js";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/workflows", label: "Workflows" },
  { to: "/templates", label: "Templates" },
  { to: "/credentials", label: "Credentials" },
  { to: "/runs", label: "Runs" },
  { to: "/schedules", label: "Schedules" },
  { to: "/settings", label: "Settings" },
];

export function TopNav() {
  const { user, workspace, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);

  async function runSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) { setResults(null); return; }
    const res = await api.get(`/api/search?q=${encodeURIComponent(q)}`);
    setResults(res);
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] px-4">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
            <WorkflowIcon size={16} />
          </div>
          <span className="text-[15px]">FlowPilot</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? "bg-brand-500/10 text-brand-600 dark:text-brand-400" : "text-[rgb(var(--text-muted))] hover:bg-black/5 hover:text-[rgb(var(--text))] dark:hover:bg-white/5"}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button onClick={() => setSearchOpen((v) => !v)} className="rounded-lg p-2 text-[rgb(var(--text-muted))] hover:bg-black/5 dark:hover:bg-white/5" aria-label="Search">
            <Search size={18} />
          </button>
          {searchOpen && (
            <div className="absolute right-0 top-11 w-80 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-3 shadow-lg animate-slide-up">
              <input
                autoFocus value={query} onChange={(e) => runSearch(e.target.value)}
                placeholder="Search workflows, templates, credentials, runs..."
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm outline-none"
              />
              {results && (
                <div className="mt-2 max-h-72 space-y-3 overflow-auto text-sm">
                  {["workflows", "templates", "credentials", "runs"].map((key) =>
                    results[key]?.length ? (
                      <div key={key}>
                        <p className="mb-1 text-xs font-semibold uppercase text-[rgb(var(--text-muted))]">{key}</p>
                        {results[key].map((item: any) => (
                          <button
                            key={item.id}
                            onClick={() => { setSearchOpen(false); navigate(key === "workflows" ? `/workflows/${item.id}` : key === "runs" ? `/runs/${item.id}` : "/" + key); }}
                            className="block w-full truncate rounded-md px-2 py-1 text-left hover:bg-black/5 dark:hover:bg-white/10"
                          >
                            {item.name ?? item.workflowName}
                          </button>
                        ))}
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <ThemeToggle />
        <button className="rounded-lg p-2 text-[rgb(var(--text-muted))] hover:bg-black/5 dark:hover:bg-white/5" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <ChevronDown size={14} className="text-[rgb(var(--text-muted))]" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-56 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-1.5 shadow-lg animate-slide-up">
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-[rgb(var(--text-muted))]">{workspace?.name}</p>
              </div>
              <button onClick={() => navigate("/settings")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10">
                <Settings size={15} /> Settings
              </button>
              <button onClick={async () => { await logout(); navigate("/login"); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-red-500 hover:bg-red-500/10">
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { mode, setMode } = useThemeStore();
  const next = { light: "dark", dark: "system", system: "light" } as const;
  const icon = { light: <Sun size={18} />, dark: <Moon size={18} />, system: <Monitor size={18} /> }[mode];
  return (
    <button onClick={() => setMode(next[mode])} className="rounded-lg p-2 text-[rgb(var(--text-muted))] hover:bg-black/5 dark:hover:bg-white/5" title={`Theme: ${mode}`}>
      {icon}
    </button>
  );
}
