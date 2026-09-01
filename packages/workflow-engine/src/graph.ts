import type { WorkflowEdge, WorkflowNode } from "@flowpilot/workflow-schema";

export class StopSignal extends Error {
  constructor(public status: "success" | "failed", message?: string) {
    super(message ?? `Workflow stopped (${status})`);
    this.name = "StopSignal";
  }
}

/**
 * Resolves the ordered chain of nodes for a given scope: either the
 * top-level flow (parentId === null) or a container's named branch
 * ("true"/"false" for IF, a switch case value, or "loop" for loop bodies).
 * Nodes are linked purely by edges *within the scope* — a container node
 * itself is a single node in its parent's chain; its children live in their
 * own nested scope addressed by (parentId, branch).
 */
export function buildChain(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  parentId: string | null,
  branch: string | null
): WorkflowNode[] {
  const scoped = nodes.filter((n) => {
    const nodeParent = n.parentId ?? null;
    if (nodeParent !== parentId) return false;
    if (parentId === null) return true;
    return (n.branch ?? null) === branch;
  });
  if (scoped.length === 0) return [];

  const idsInScope = new Set(scoped.map((n) => n.id));
  const nextMap = new Map<string, string>();
  for (const e of edges) {
    if (idsInScope.has(e.source) && idsInScope.has(e.target)) nextMap.set(e.source, e.target);
  }
  const hasIncoming = new Set([...nextMap.values()]);
  const roots = scoped.filter((n) => !hasIncoming.has(n.id));
  const start = roots[0] ?? scoped[0];

  const order: WorkflowNode[] = [];
  const visited = new Set<string>();
  let current: WorkflowNode | undefined = start;
  while (current && !visited.has(current.id)) {
    order.push(current);
    visited.add(current.id);
    const nextId = nextMap.get(current.id);
    current = nextId ? scoped.find((n) => n.id === nextId) : undefined;
  }
  return order;
}

export function findRootNode(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode | undefined {
  const chain = buildChain(nodes, edges, null, null);
  return chain[0];
}
