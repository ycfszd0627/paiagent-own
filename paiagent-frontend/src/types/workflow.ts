export type NodeType = 'INPUT' | 'OUTPUT' | 'LLM' | 'TOOL'

export interface NodeConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  voice?: string
  language_type?: string
  [key: string]: unknown
}

export interface WorkflowNodeData {
  label: string
  type: NodeType
  subtype?: string
  config: NodeConfig
}

export interface WorkflowDTO {
  id?: number
  name: string
  description?: string
  status?: string
  canvasState?: Record<string, unknown>
  nodes: {
    nodeId: string
    type: string
    subtype?: string
    label: string
    position: { x: number; y: number }
    config: Record<string, unknown>
  }[]
  edges: {
    edgeId: string
    sourceNodeId: string
    sourcePort?: string
    targetNodeId: string
    targetPort?: string
  }[]
  createdAt?: string
  updatedAt?: string
}

export interface NodeTypeInfo {
  type: string
  subtype: string | null
  label: string
  category: string
  icon: string
  defaultConfig: Record<string, unknown>
  inputs: { name: string; label: string }[]
  outputs: { name: string; label: string }[]
}

export interface ExecutionStep {
  nodeId: string
  label: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  output?: string
  error?: string
  durationMs?: number
}

export interface ExecutionResult {
  id?: number
  workflowId?: number
  status: string
  inputData?: string
  outputData?: string
  errorMessage?: string
  durationMs?: number
  startedAt?: string
  finishedAt?: string
}
