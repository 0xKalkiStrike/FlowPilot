import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflow } from '../../context/WorkflowContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { CustomNode } from './CustomNode.js';
import { NODE_DEFINITIONS } from '../../lib/nodeDefinitions.js';
import { IconRenderer } from '../common/IconRenderer.js';
import { Search, Plus, X, Sparkles, Code2 } from 'lucide-react';

export const WorkflowCanvas: React.FC = () => {
  const { nodes, edges, setNodes, setEdges, setSelectedNodeId, addNode, deleteNode } = useWorkflow();
  const { isDark } = useTheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Quick Add Context Menu
  const [quickAddPos, setQuickAddPos] = useState<{ x: number; y: number; canvasX: number; canvasY: number } | null>(null);
  const [quickAddSearch, setQuickAddSearch] = useState('');

  // Register CustomNode for every known node type
  const nodeTypes = useMemo(() => {
    const types: Record<string, any> = {};
    Object.keys(NODE_DEFINITIONS).forEach((t) => {
      types[t] = CustomNode;
    });
    types['default'] = CustomNode;
    return types;
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // @ts-ignore
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // @ts-ignore
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `edge_${connection.source}_${connection.sourceHandle || 'def'}_to_${connection.target}`,
        animated: true,
        style: { stroke: isDark ? '#38bdf8' : '#0284c7', strokeWidth: 2 }
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, isDark]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: any) => {
      setSelectedNodeId(node.id);
      setQuickAddPos(null);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setQuickAddPos(null);
  }, [setSelectedNodeId]);

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const rect = reactFlowWrapper.current?.getBoundingClientRect();
    if (!rect) return;

    setQuickAddPos({
      x: Math.min(event.clientX - rect.left, rect.width - 320),
      y: Math.min(event.clientY - rect.top, rect.height - 380),
      canvasX: event.clientX - rect.left - 100,
      canvasY: event.clientY - rect.top - 40
    });
    setQuickAddSearch('');
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40
      };

      addNode(nodeType, position);
    },
    [addNode]
  );

  const handleSelectQuickNode = (nodeType: string) => {
    if (quickAddPos) {
      addNode(nodeType, { x: quickAddPos.canvasX, y: quickAddPos.canvasY });
    } else {
      addNode(nodeType, { x: 350, y: 200 });
    }
    setQuickAddPos(null);
  };

  const allNodes = Object.values(NODE_DEFINITIONS);
  const filteredQuickNodes = quickAddSearch
    ? allNodes.filter(
        (n) =>
          n.label.toLowerCase().includes(quickAddSearch.toLowerCase()) ||
          n.description.toLowerCase().includes(quickAddSearch.toLowerCase()) ||
          n.category.toLowerCase().includes(quickAddSearch.toLowerCase())
      )
    : allNodes.slice(0, 14);

  return (
    <div
      ref={reactFlowWrapper}
      onContextMenu={onContextMenu}
      className="w-full h-full relative bg-surface-50 dark:bg-surface-950 select-none overflow-hidden"
    >
      <ReactFlow
        nodes={nodes as any}
        edges={edges as any}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: isDark ? '#64748b' : '#94a3b8', strokeWidth: 2 }
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color={isDark ? '#1e293b' : '#cbd5e1'}
        />
        <Controls
          className="!bg-white/80 dark:!bg-surface-900/80 !border-surface-200 dark:!border-surface-800 !shadow-elevated !rounded-xl overflow-hidden"
        />
        <MiniMap
          nodeStrokeColor={isDark ? '#334155' : '#e2e8f0'}
          nodeColor={isDark ? '#1e293b' : '#f1f5f9'}
          maskColor={isDark ? 'rgba(9, 13, 22, 0.7)' : 'rgba(248, 250, 252, 0.7)'}
          className="!bg-white/80 dark:!bg-surface-900/80 !border-surface-200 dark:!border-surface-800 !rounded-xl !shadow-elevated overflow-hidden !bottom-5 !right-5"
        />
      </ReactFlow>

      {/* Floating Quick Add Trigger Button */}
      <button
        onClick={(e) => {
          const rect = reactFlowWrapper.current?.getBoundingClientRect();
          if (rect) {
            setQuickAddPos({
              x: 20,
              y: 20,
              canvasX: 350,
              canvasY: 200
            });
            setQuickAddSearch('');
          }
        }}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3.5 py-2 bg-white/90 dark:bg-surface-900/90 hover:bg-white dark:hover:bg-surface-800 border border-surface-200 dark:border-surface-700/80 rounded-xl text-xs font-bold text-surface-800 dark:text-surface-100 shadow-elevated backdrop-blur-md transition-all active:scale-95 group"
      >
        <div className="w-5 h-5 rounded-lg bg-brand-500 text-white flex items-center justify-center shadow-xs">
          <Plus className="w-3.5 h-3.5" />
        </div>
        <span>+ Quick Add Node</span>
        <span className="text-[10px] text-surface-400 font-mono font-normal">(or right-click)</span>
      </button>

      {/* n8n-Style Quick-Add Context Popup */}
      {quickAddPos && (
        <div
          style={{ top: `${quickAddPos.y}px`, left: `${quickAddPos.x}px` }}
          className="absolute z-50 w-80 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl border border-surface-200 dark:border-surface-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
        >
          {/* Header & Search */}
          <div className="p-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-950/30 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-surface-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                autoFocus
                value={quickAddSearch}
                onChange={(e) => setQuickAddSearch(e.target.value)}
                placeholder="Search nodes (e.g. Python, Scrape, JS)..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
            </div>
            <button
              onClick={() => setQuickAddPos(null)}
              className="p-1 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Node List */}
          <div className="max-h-72 overflow-y-auto p-2 space-y-1">
            <div className="text-[10px] font-bold text-surface-400 uppercase tracking-wider px-2 py-0.5">
              {quickAddSearch ? 'Search Results' : 'Recommended & Zero-Key Nodes'}
            </div>

            {filteredQuickNodes.map((n) => (
              <div
                key={n.type}
                onClick={() => handleSelectQuickNode(n.type)}
                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800/80 cursor-pointer transition-colors group"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                  style={{ backgroundColor: n.color }}
                >
                  <IconRenderer name={n.icon} className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="truncate flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-900 dark:text-white group-hover:text-brand-500 truncate">
                      {n.label}
                    </span>
                    {n.category === 'CODE' && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded font-bold">
                        0-Key
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-surface-400 truncate">{n.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-950/30 text-[10px] text-surface-400 flex items-center justify-between px-3">
            <span>Press Esc to close</span>
            <span className="font-semibold text-brand-500">FlowPilot Engine 2.0</span>
          </div>
        </div>
      )}
    </div>
  );
};
