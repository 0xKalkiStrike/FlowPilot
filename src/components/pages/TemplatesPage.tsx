import React, { useEffect, useState } from 'react';
import { Layers, Sparkles, ArrowRight, Zap, Check, Search, Code2, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Template } from '../../types/workflow.js';
import { useWorkflow } from '../../context/WorkflowContext.js';
import { IconRenderer } from '../common/IconRenderer.js';

interface TemplatesPageProps {
  onNavigateTab: (tab: string) => void;
}

export const TemplatesPage: React.FC<TemplatesPageProps> = ({ onNavigateTab }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const { setWorkflow } = useWorkflow();

  useEffect(() => {
    api.getTemplates().then((tpls) => {
      setTemplates(tpls || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleUseTemplate = async (tplId: string) => {
    setCloningId(tplId);
    try {
      const cloned = await api.cloneTemplate(tplId);
      const fullWf = await api.getWorkflow(cloned.id);
      setWorkflow(fullWf);
      onNavigateTab('editor');
    } catch (err: any) {
      alert(`Failed to clone template: ${err.message}`);
    } finally {
      setCloningId(null);
    }
  };

  const categories = ['ALL', 'Zero-Key Python & Scraping', 'Zero-Key JavaScript', 'Free Local AI', 'System & CLI', 'E-Commerce', 'Monitoring & Alerts', 'Authentication'];

  const filtered = templates.filter((tpl) => {
    const matchesSearch =
      tpl.title.toLowerCase().includes(search.toLowerCase()) ||
      tpl.description.toLowerCase().includes(search.toLowerCase()) ||
      tpl.category.toLowerCase().includes(search.toLowerCase());

    const matchesCat = selectedCategory === 'ALL' || tpl.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800/60 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zero-API-Key Automation Templates</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white">Workflow Template Library</h1>
          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400">
            Instantly clone pre-built automations powered by Python, Node.js, RSS feeds, Free HTTP scrapers, and Local AI.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-xs text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
            }`}
          >
            {cat === 'ALL' ? 'All Templates' : cat}
          </button>
        ))}
      </div>

      {/* Template Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-surface-400">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-xs text-surface-400">No templates match your search or filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((tpl) => {
            const isZeroKey =
              tpl.category.includes('Zero-Key') ||
              tpl.category.includes('Free') ||
              tpl.category.includes('System');

            return (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-subtle hover:shadow-elevated transition-all flex flex-col justify-between space-y-4 group relative overflow-hidden"
              >
                {/* Glow accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors pointer-events-none" />

                <div className="space-y-3 relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-xs shrink-0">
                        <IconRenderer name={tpl.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-surface-900 dark:text-white leading-tight">
                          {tpl.title}
                        </h3>
                        <span className="text-[10px] text-surface-400 font-semibold uppercase tracking-wider">
                          {tpl.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed line-clamp-3">
                    {tpl.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 font-mono">
                      {tpl.nodes?.length || 0} nodes
                    </span>
                    {isZeroKey ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200/50 dark:border-emerald-800/40">
                        ✓ 0 API Key Required
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 font-mono">
                        Playwright Browser
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center justify-end relative z-10">
                  <button
                    onClick={() => handleUseTemplate(tpl.id)}
                    disabled={cloningId === tpl.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-sm group-hover:shadow-glow-brand transition-all disabled:opacity-50 active:scale-98"
                  >
                    <span>{cloningId === tpl.id ? 'Cloning Template...' : 'Clone & Open in Flow Canvas'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
