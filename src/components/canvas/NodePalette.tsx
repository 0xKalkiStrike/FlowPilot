import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, Sparkles, Code2 } from 'lucide-react';
import { NODE_DEFINITIONS, CATEGORIES } from '../../lib/nodeDefinitions.js';
import { IconRenderer } from '../common/IconRenderer.js';
import { useWorkflow } from '../../context/WorkflowContext.js';

export const NodePalette: React.FC = () => {
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    CODE: true,
    DATA: true,
    LOGIC: true,
    FILES: true,
    SERVICES: true,
    TRIGGERS: true,
    BROWSER: false,
    INTERACTION: false,
    FORMS: false,
    PAYMENT: false
  });

  const { addNode } = useWorkflow();

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const allNodes = Object.values(NODE_DEFINITIONS);
  const filteredNodes = search
    ? allNodes.filter(
        (n) =>
          n.label.toLowerCase().includes(search.toLowerCase()) ||
          n.description.toLowerCase().includes(search.toLowerCase()) ||
          n.category.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <aside className="w-68 border-r border-surface-200/80 dark:border-surface-800/80 bg-white/70 dark:bg-surface-900/70 backdrop-blur-xl flex flex-col h-[calc(100vh-3.5rem)] select-none shadow-2xs">
      {/* Header & Search */}
      <div className="p-3.5 border-b border-surface-200/80 dark:border-surface-800/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-surface-900 dark:text-white uppercase tracking-wider">
            Node Library
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full font-bold border border-emerald-200/60 dark:border-emerald-800/60">
            Zero-Key Ready
          </span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-surface-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes (e.g. Python, Scrape, AI)..."
            className="w-full pl-8 pr-3 py-1.5 bg-surface-100/90 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60 rounded-xl text-xs text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium transition-all"
          />
        </div>
      </div>

      {/* Node List Scrollable */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {filteredNodes ? (
          <div>
            <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider px-2 py-1">
              Matching Nodes ({filteredNodes.length})
            </div>
            <div className="space-y-1 mt-1">
              {filteredNodes.map((node) => (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200/60 dark:border-surface-700/50 cursor-grab active:cursor-grabbing group transition-all shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: node.color }}
                    >
                      <IconRenderer name={node.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-surface-900 dark:text-white group-hover:text-brand-500 truncate">
                        {node.label}
                      </div>
                      <div className="text-[10px] text-surface-400 truncate">{node.description}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => addNode(node.type, { x: 300, y: 200 })}
                    className="p-1 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Add to canvas"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const isOpen = Boolean(openCategories[cat.id]);
            const catNodes = allNodes.filter((n) => n.category === cat.id);

            return (
              <div key={cat.id} className="rounded-xl overflow-hidden border border-transparent hover:border-surface-200/50 dark:hover:border-surface-800/50 transition-colors">
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-surface-700 dark:text-surface-200 hover:bg-surface-100/70 dark:hover:bg-surface-800/60 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-surface-400" /> : <ChevronRight className="w-3.5 h-3.5 text-surface-400" />}
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-[10px] text-surface-400 bg-surface-100 dark:bg-surface-800/80 px-1.5 py-0.2 rounded-md font-mono font-bold">
                    {catNodes.length}
                  </span>
                </button>

                {isOpen && (
                  <div className="pl-2 pr-1 py-1 space-y-1 mt-0.5">
                    {catNodes.map((node) => (
                      <div
                        key={node.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, node.type)}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-surface-800/40 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200/50 dark:border-surface-700/40 cursor-grab active:cursor-grabbing group transition-all shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: node.color }}
                          >
                            <IconRenderer name={node.icon} className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold text-surface-900 dark:text-white group-hover:text-brand-500 truncate">
                              {node.label}
                            </div>
                            <div className="text-[10px] text-surface-400 truncate">{node.description}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => addNode(node.type, { x: 300, y: 200 })}
                          className="p-1 rounded-lg hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-900 dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Add to canvas"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-surface-200/80 dark:border-surface-800/80 text-[10px] text-surface-400 text-center font-medium bg-surface-50/50 dark:bg-surface-950/30">
        💡 Drag nodes to canvas or click + to add
      </div>
    </aside>
  );
};
