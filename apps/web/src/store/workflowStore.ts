import { create } from "zustand";
import type { Edge, Node } from "@xyflow/react";
import { api } from "../lib/api.js";
import { generateClientId } from "../lib/id.js";

export interface WorkflowNodeData {
  id: string;
  type: string;
  label?: string;
  config: Record<string, unknown>;
  target?: Record<string, unknown>;
  timeout?: number;
  retry?: { maxAttempts: number; delayMs: number };
  errorHandling?: { onError: "stop" | "continue" | "retry"; screenshotOnError: boolean; capturePageHtml: boolean };
  credentialId?: string;
  parentId?: string | null;
  branch?: string;
  metadata?: Record<string, unknown>;
}

export type FlowNodeType = Node<{ node: WorkflowNodeData }, "flowNode">;

interface ValidationIssue { nodeId?: string; message: string; severity: "error" | "warning" }
interface NodeRuntimeStatus { status: "started" | "success" | "failed"; error?: string }

interface WorkflowState {
  id: string | null;
  name: string;
  description: string;
  trigger: { type: string; config: Record<string, unknown> };
  variables: { name: string; type: string; defaultValue?: unknown; sensitive: boolean }[];
  browserConfig: Record<string, unknown>;
  nodes: FlowNodeType[];
  edges: Edge[];
  selectedNodeId: string | null;
  dirty: boolean;
  saving: boolean;
  loaded: boolean;
  validation: { issues: ValidationIssue[]; canRun: boolean } | null;
  nodeStatuses: Record<string, NodeRuntimeStatus>;
  activeExecutionId: string | null;

  reset: () => void;
  loadWorkflow: (id: string) => Promise<void>;
  createWorkflow: (name: string, description?: string) => Promise<string>;
  addNode: (type: string, position: { x: number; y: number }, defLabel: string) => string;
  updateNode: (id: string, patch: Partial<WorkflowNodeData>) => void;
  deleteNode: (id: string) => void;
  setNodes: (nodes: FlowNodeType[]) => void;
  setEdges: (edges: Edge[]) => void;
  addEdge: (edge: Edge) => void;
  select: (id: string | null) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setTrigger: (trigger: { type: string; config: Record<string, unknown> }) => void;
  setVariables: (vars: WorkflowState["variables"]) => void;
  setBrowserConfig: (cfg: Record<string, unknown>) => void;
  save: () => Promise<void>;
  loadFromDocument: (doc: any, id: string | null) => void;
  toDocument: () => any;
  setNodeStatus: (nodeId: string, status: NodeRuntimeStatus) => void;
  clearNodeStatuses: () => void;
  setActiveExecutionId: (id: string | null) => void;
}

function toRFNodes(nodes: WorkflowNodeData[]): FlowNodeType[] {
  return nodes.map((n: any) => ({
    id: n.id, type: "flowNode", position: n.position ?? { x: 0, y: 0 }, data: { node: n },
  }));
}
function toRFEdges(edges: any[]): Edge[] {
  return edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, animated: false }));
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  id: null, name: "Untitled Workflow", description: "",
  trigger: { type: "manual", config: {} }, variables: [], browserConfig: { headless: false },
  nodes: [], edges: [], selectedNodeId: null, dirty: false, saving: false, loaded: false,
  validation: null, nodeStatuses: {}, activeExecutionId: null,

  reset: () => set({
    id: null, name: "Untitled Workflow", description: "", trigger: { type: "manual", config: {} },
    variables: [], browserConfig: { headless: false }, nodes: [], edges: [], selectedNodeId: null,
    dirty: false, loaded: false, validation: null, nodeStatuses: {}, activeExecutionId: null,
  }),

  loadWorkflow: async (id) => {
    const doc = await api.get<any>(`/api/workflows/${id}`);
    get().loadFromDocument(doc, id);
  },

  createWorkflow: async (name, description) => {
    const doc = await api.post<any>("/api/workflows", { name, description });
    get().loadFromDocument(doc, doc.id);
    return doc.id;
  },

  loadFromDocument: (doc, id) => {
    set({
      id, name: doc.name, description: doc.description ?? "", trigger: doc.trigger ?? { type: "manual", config: {} },
      variables: doc.variables ?? [], browserConfig: doc.browserConfig ?? {},
      nodes: toRFNodes((doc.nodes ?? []).map((n: any) => ({ ...n, position: n.position }))),
      edges: toRFEdges(doc.edges ?? []),
      dirty: false, loaded: true, selectedNodeId: null, validation: doc.validation ?? null,
    });
  },

  addNode: (type, position, defLabel) => {
    const id = generateClientId("node");
    const newNode: FlowNodeType = { id, type: "flowNode", position, data: { node: { id, type, label: defLabel, config: {} } } };
    set((s) => ({ nodes: [...s.nodes, newNode], dirty: true, selectedNodeId: id }));
    return id;
  },

  updateNode: (id, patch) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { node: { ...n.data.node, ...patch } } } : n)),
      dirty: true,
    }));
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id).map((n) => (n.data.node.parentId === id ? { ...n, data: { node: { ...n.data.node, parentId: null, branch: undefined } } } : n)),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      dirty: true,
    }));
  },

  setNodes: (nodes) => set({ nodes, dirty: true }),
  setEdges: (edges) => set({ edges, dirty: true }),
  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge], dirty: true })),
  select: (id) => set({ selectedNodeId: id }),
  setName: (name) => set({ name, dirty: true }),
  setDescription: (description) => set({ description, dirty: true }),
  setTrigger: (trigger) => set({ trigger, dirty: true }),
  setVariables: (variables) => set({ variables, dirty: true }),
  setBrowserConfig: (browserConfig) => set({ browserConfig, dirty: true }),

  toDocument: () => {
    const s = get();
    return {
      schemaVersion: "1.0", name: s.name, description: s.description, trigger: s.trigger,
      variables: s.variables, browserConfig: s.browserConfig,
      nodes: s.nodes.map((n) => ({ ...n.data.node, id: n.id, position: n.position })),
      edges: s.edges.map((e) => ({ id: e.id, source: e.source!, target: e.target!, sourceHandle: e.sourceHandle ?? undefined, targetHandle: e.targetHandle ?? undefined })),
    };
  },

  save: async () => {
    const s = get();
    if (!s.id) return;
    set({ saving: true });
    try {
      const doc = get().toDocument();
      const res = await api.put<any>(`/api/workflows/${s.id}`, doc);
      set({ dirty: false, validation: res.validation ?? null });
    } finally {
      set({ saving: false });
    }
  },

  setNodeStatus: (nodeId, status) => set((s) => ({ nodeStatuses: { ...s.nodeStatuses, [nodeId]: status } })),
  clearNodeStatuses: () => set({ nodeStatuses: {} }),
  setActiveExecutionId: (id) => set({ activeExecutionId: id }),
}));
