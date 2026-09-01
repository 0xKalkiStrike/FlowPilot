import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Workflow, WorkflowNode, WorkflowEdge, NodeData } from '../types/workflow.js';
import { NODE_DEFINITIONS } from '../lib/nodeDefinitions.js';
import { api } from '../lib/api.js';
import { v4 as uuidv4 } from 'uuid';

interface WorkflowContextType {
  workflow: Workflow | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;

  setWorkflow: (wf: Workflow) => void;
  setNodes: (nodes: WorkflowNode[] | ((prev: WorkflowNode[]) => WorkflowNode[])) => void;
  setEdges: (edges: WorkflowEdge[] | ((prev: WorkflowEdge[]) => WorkflowEdge[])) => void;
  setSelectedNodeId: (id: string | null) => void;

  addNode: (type: string, position: { x: number; y: number }) => WorkflowNode;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  updateWorkflowDetails: (name: string, description: string, tags: string[], variables: Record<string, any>) => void;

  saveWorkflow: () => Promise<Workflow | null>;
  undo: () => void;
  redo: () => void;
  resetWorkflow: (initial?: Partial<Workflow>) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [workflow, setWorkflowState] = useState<Workflow | null>(null);
  const [nodes, setNodesState] = useState<WorkflowNode[]>([]);
  const [edges, setEdgesState] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Undo / Redo history stacks
  const undoStack = useRef<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }[]>([]);
  const redoStack = useRef<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }[]>([]);

  const pushHistory = useCallback((currentNodes: WorkflowNode[], currentEdges: WorkflowEdge[]) => {
    undoStack.current.push({
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: JSON.parse(JSON.stringify(currentEdges))
    });
    if (undoStack.current.length > 30) {
      undoStack.current.shift();
    }
    redoStack.current = [];
    setIsDirty(true);
  }, []);

  const setNodes = useCallback((action: WorkflowNode[] | ((prev: WorkflowNode[]) => WorkflowNode[])) => {
    setNodesState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      return next;
    });
    setIsDirty(true);
  }, []);

  const setEdges = useCallback((action: WorkflowEdge[] | ((prev: WorkflowEdge[]) => WorkflowEdge[])) => {
    setEdgesState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      return next;
    });
    setIsDirty(true);
  }, []);

  const setWorkflow = (wf: Workflow) => {
    setWorkflowState(wf);
    setNodesState(wf.nodes || []);
    setEdgesState(wf.edges || []);
    setSelectedNodeId(null);
    undoStack.current = [];
    redoStack.current = [];
    setIsDirty(false);
  };

  const addNode = (type: string, position: { x: number; y: number }): WorkflowNode => {
    pushHistory(nodes, edges);
    const def = NODE_DEFINITIONS[type] || {
      label: type,
      description: '',
      color: '#0c8ee9',
      defaultData: { label: type }
    };

    const id = `node_${uuidv4().substring(0, 8)}`;
    const newNode: WorkflowNode = {
      id,
      type,
      position,
      data: {
        id,
        type,
        label: def.label,
        title: def.label,
        description: def.description,
        ...def.defaultData
      }
    };

    setNodesState((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
    return newNode;
  };

  const updateNodeData = (id: string, data: Partial<NodeData>) => {
    pushHistory(nodes, edges);
    setNodesState((prev) =>
      prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
    );
  };

  const deleteNode = (id: string) => {
    pushHistory(nodes, edges);
    setNodesState((prev) => prev.filter((n) => n.id !== id));
    setEdgesState((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const duplicateNode = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    pushHistory(nodes, edges);
    const newId = `node_${uuidv4().substring(0, 8)}`;
    const duplicate: WorkflowNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: { ...node.data, id: newId, label: `${node.data.label} (Copy)` }
    };

    setNodesState((prev) => [...prev, duplicate]);
    setSelectedNodeId(newId);
  };

  const updateWorkflowDetails = (
    name: string,
    description: string,
    tags: string[],
    variables: Record<string, any>
  ) => {
    if (!workflow) return;
    setWorkflowState({ ...workflow, name, description, tags, variables });
    setIsDirty(true);
  };

  const saveWorkflow = async (): Promise<Workflow | null> => {
    if (!workflow) return null;
    setIsSaving(true);
    try {
      const payload: Partial<Workflow> = {
        name: workflow.name || 'Untitled Workflow',
        description: workflow.description || '',
        trigger_type: workflow.trigger_type || 'manual',
        nodes,
        edges,
        variables: workflow.variables || {},
        tags: workflow.tags || []
      };

      let saved: Workflow;
      if (workflow.id && !workflow.id.startsWith('new_')) {
        saved = await api.updateWorkflow(workflow.id, payload);
      } else {
        saved = await api.createWorkflow(payload);
      }

      setWorkflowState(saved);
      setIsDirty(false);
      return saved;
    } catch (err) {
      console.error('Failed to save workflow:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const undo = () => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    redoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    });
    setNodesState(prev.nodes);
    setEdgesState(prev.edges);
  };

  const redo = () => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    });
    setNodesState(next.nodes);
    setEdgesState(next.edges);
  };

  const resetWorkflow = (initial?: Partial<Workflow>) => {
    const fresh: Workflow = {
      id: `new_${uuidv4().substring(0, 8)}`,
      name: initial?.name || 'New Browser Workflow',
      description: initial?.description || 'Automate repetitive browser tasks visually',
      trigger_type: 'manual',
      nodes: initial?.nodes || [
        {
          id: 'node_trigger',
          type: 'trigger_manual',
          position: { x: 300, y: 80 },
          data: {
            id: 'node_trigger',
            type: 'trigger_manual',
            label: 'Manual Trigger',
            description: 'Starts workflow on click'
          }
        },
        {
          id: 'node_open',
          type: 'browser_open_url',
          position: { x: 300, y: 220 },
          data: {
            id: 'node_open',
            type: 'browser_open_url',
            label: 'Open Website',
            url: 'https://news.ycombinator.com',
            waitUntil: 'domcontentloaded'
          }
        }
      ],
      edges: initial?.edges || [
        { id: 'edge_init', source: 'node_trigger', target: 'node_open', animated: true }
      ],
      variables: initial?.variables || {},
      is_active: true,
      tags: initial?.tags || ['Draft'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setWorkflow(fresh);
  };

  return (
    <WorkflowContext.Provider
      value={{
        workflow,
        nodes,
        edges,
        selectedNodeId,
        isDirty,
        isSaving,
        canUndo: undoStack.current.length > 0,
        canRedo: redoStack.current.length > 0,
        setWorkflow,
        setNodes,
        setEdges,
        setSelectedNodeId,
        addNode,
        updateNodeData,
        deleteNode,
        duplicateNode,
        updateWorkflowDetails,
        saveWorkflow,
        undo,
        redo,
        resetWorkflow
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider');
  return context;
}
