import { create } from 'zustand'
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
} from 'reactflow'
import { nanoid } from 'nanoid'
import type { WorkflowNodeData } from '@/types/workflow'

interface FlowState {
  nodes: Node<WorkflowNodeData>[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  addNode: (type: string, subtype: string | undefined, label: string, position: { x: number; y: number }, config?: Record<string, unknown>) => void
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void
  removeNode: (nodeId: string) => void
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  clearAll: () => void
}

// Initial nodes with default INPUT and OUTPUT nodes
const initialNodes: Node<WorkflowNodeData>[] = [
  {
    id: 'input-node',
    type: 'inputNode',
    position: { x: 100, y: 100 },
    data: {
      label: '输入',
      type: 'INPUT',
      config: {},
    },
  },
  {
    id: 'output-node',
    type: 'outputNode',
    position: { x: 500, y: 100 },
    data: {
      label: '输出',
      type: 'OUTPUT',
      config: {},
    },
  },
]

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: [],

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) })
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },

  onConnect: (connection: Connection) => {
    set({ edges: addEdge({ ...connection, id: `edge-${nanoid(8)}` }, get().edges) })
  },

  addNode: (type, subtype, label, position, config = {}) => {
    const id = `node-${nanoid(8)}`
    const newNode: Node<WorkflowNodeData> = {
      id,
      type:
        type === 'INPUT' ? 'inputNode'
        : type === 'OUTPUT' ? 'outputNode'
        : type === 'LLM' ? 'llmNode'
        : type === 'CONDITION' ? 'conditionNode'
        : 'toolNode',
      position,
      data: {
        label,
        type: type as WorkflowNodeData['type'],
        subtype,
        config,
      },
    }
    set({ nodes: [...get().nodes, newNode] })
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    })
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    })
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  clearAll: () => set({ nodes: initialNodes, edges: [] }),
}))
