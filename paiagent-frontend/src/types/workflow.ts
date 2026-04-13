export type NodeType = 'INPUT' | 'OUTPUT' | 'LLM' | 'TOOL' | 'CONDITION'
export type WorkflowFrameworkType = 'DAG' | 'LANGGRAPH4J'
export type LangGraphRouteMatchType = 'contains' | 'equals' | 'regex'
export type LLMOutputMode = 'text' | 'json'
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'regex'
  | 'less_than'
  | 'less_or_equal'
  | 'greater_than'
  | 'greater_or_equal'
  | 'exists'
  | 'not_exists'

export interface LangGraphRouteRule {
  id: string
  matchType: LangGraphRouteMatchType
  matchValue: string
  nextNodeId: string
}

export interface LangGraphRoutingConfig {
  defaultNextNodeId?: string
  rules: LangGraphRouteRule[]
}

export interface ConditionRule {
  id: string
  variablePath: string
  operator: ConditionOperator
  compareValue?: string
  nextNodeId: string
  outputVariablePath?: string
}

export interface LLMOutputParam {
  id: string
  name: string
  jsonPath?: string
  description?: string
}

export interface LLMAdditionalInput {
  id: string
  variablePath: string
  label?: string
}

export interface NodeConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  outputMode?: LLMOutputMode
  outputParams?: LLMOutputParam[]
  additionalInputs?: LLMAdditionalInput[]
  voice?: string
  language_type?: string
  langGraphRouting?: LangGraphRoutingConfig
  conditionRules?: ConditionRule[]
  defaultNextNodeId?: string
  defaultOutputVariablePath?: string
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
  frameworkType?: WorkflowFrameworkType
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
