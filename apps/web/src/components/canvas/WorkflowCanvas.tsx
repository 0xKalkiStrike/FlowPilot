import { useCallback, useRef } from "react";
import {
  ReactFlow, Background, MiniMap, Controls, BackgroundVariant,
  useReactFlow, applyNodeChanges, applyEdgeChanges, addEdge as rfAddEdge,
  type NodeChange, type EdgeChange, type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "../../store/workflowStore.js";
import { useNodeRegistryStore } from "../../store/nodeRegistryStore.js";
import { FlowNode } from "./FlowNode.js";
import { generateClientId } from "../../lib/id.js";

const nodeTypes = { flowNode: FlowNode };

export function WorkflowCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, setNodes, setEdges, addEdge, select, addNode } = useWorkflowStore();
  const byType = useNodeRegistryStore((s) => s.byType);
  const { screenToFlowPosition } = useReactFlow();

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes(applyNodeChanges(changes, nodes) as any), [nodes, setNodes]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges(applyEdgeChanges(changes, edges)), [edges, setEdges]);
  const onConnect = useCallback((conn: Connection) => addEdge({ id: generateClientId("edge"), ...conn } as any), [addEdge]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData("application/flowpilot-node-type");
      if (!type) return;
      const def = byType[type];
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(type, position, def?.label ?? type);
    },
    [byType, screenToFlowPosition, addNode]
  );

  return (
    <div ref={wrapperRef} className="h-full w-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => select(node.id)}
        onPaneClick={() => select(null)}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Meta", "Control"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <MiniMap pannable zoomable className="!bg-[rgb(var(--bg-elevated))]" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
