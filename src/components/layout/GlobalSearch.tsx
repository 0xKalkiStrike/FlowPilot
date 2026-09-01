import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Workflow, Layers, Key, PlayCircle, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api.js';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWorkflow: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onSelectWorkflow,
  onNavigateTab
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ workflows: any[]; credentials: any[]; executions: any[] }>({
    workflows: [],
    credentials: [],
    executions: []
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ workflows: [], credentials: [], executions: [] });
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else inputRef.current?.focus();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ workflows: [], credentials: [], executions: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.globalSearch(query);
        setResults(res || { workflows: [], credentials: [], executions: [] });
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults = results.workflows.length + results.credentials.length + results.executions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white dark:bg-surface-900 rounded-xl shadow-2xl border border-surface-200 dark:border-surface-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3 border-b border-surface-200 dark:border-surface-800">
          <Search className="w-5 h-5 text-surface-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workflows, credentials, execution runs..."
            className="flex-1 bg-transparent text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] font-mono bg-surface-100 dark:bg-surface-800 text-surface-500 px-1.5 py-0.5 rounded ml-2 border border-surface-200 dark:border-surface-700">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="py-8 text-center text-xs text-surface-400">Searching...</div>
          )}

          {!loading && query && totalResults === 0 && (
            <div className="py-8 text-center text-xs text-surface-400">
              No results found for "<span className="font-semibold text-surface-600 dark:text-surface-300">{query}</span>"
            </div>
          )}

          {!loading && !query && (
            <div className="p-4 text-xs text-surface-400 text-center">
              Type to quickly jump to any workflow, credential secret, or run history.
            </div>
          )}

          {/* Workflows */}
          {results.workflows.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-1">Workflows</div>
              {results.workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => {
                    onSelectWorkflow(wf.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-left group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Workflow className="w-4 h-4 text-brand-500" />
                    <div>
                      <div className="text-xs font-medium text-surface-900 dark:text-white group-hover:text-brand-500">{wf.name}</div>
                      {wf.description && <div className="text-[10px] text-surface-400 truncate max-w-xs">{wf.description}</div>}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}

          {/* Credentials */}
          {results.credentials.length > 0 && (
            <div className="mb-3">
              <div className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-1">Credentials</div>
              {results.credentials.map((cred) => (
                <button
                  key={cred.id}
                  onClick={() => {
                    onNavigateTab('credentials');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-left group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Key className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="text-xs font-medium text-surface-900 dark:text-white">{cred.name}</div>
                      <div className="text-[10px] text-surface-400 uppercase">{cred.type}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}

          {/* Executions */}
          {results.executions.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider px-3 py-1">Runs & Executions</div>
              {results.executions.map((exec) => (
                <button
                  key={exec.id}
                  onClick={() => {
                    onNavigateTab('runs');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-left group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <PlayCircle className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-xs font-medium text-surface-900 dark:text-white">{exec.workflow_name}</div>
                      <div className="text-[10px] text-surface-400">{exec.status} • {exec.id}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
