import { useCallback, useMemo, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  getSmoothStepPath,
  type ConnectionLineComponentProps,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useFlowStore } from '@/stores/useFlowStore'
import { useUIStore } from '@/stores/useUIStore'
import { nodeTypes } from '@/components/nodes/CustomNodes'
import ConditionEdge from '@/components/canvas/ConditionEdge'
import { useWorkflowStore } from '@/stores/useWorkflowStore'
import type { ConditionRule, WorkflowNodeData } from '@/types/workflow'

const defaultConfig: Record<string, Record<string, unknown>> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: '',
    outputMode: 'text',
    outputParams: [],
    additionalInputs: [],
  },
  tongyi: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: '',
    model: 'qwen-max',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: '',
    outputMode: 'text',
    outputParams: [],
    additionalInputs: [],
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: '',
    outputMode: 'text',
    outputParams: [],
    additionalInputs: [],
  },
  tts: {
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
    apiKey: '',
    model: 'qwen3-tts-flash',
    voice: 'Cherry',
    language_type: 'Auto',
  },
  condition: {
    conditionRules: [],
    defaultNextNodeId: '',
    defaultOutputVariablePath: '',
  },
}

function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) {
  const [path] = getSmoothStepPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  })

  return (
    <path
      d={path}
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth={2}
      strokeDasharray="6 4"
      strokeLinecap="round"
    />
  )
}

function formatConditionRule(rule: ConditionRule) {
  const operatorLabelMap: Record<ConditionRule['operator'], string> = {
    equals: '=',
    not_equals: '!=',
    contains: '包含',
    regex: '正则',
    less_than: '<',
    less_or_equal: '<=',
    greater_than: '>',
    greater_or_equal: '>=',
    exists: '存在',
    not_exists: '不存在',
  }

  const operator = operatorLabelMap[rule.operator] || rule.operator
  if (rule.operator === 'exists' || rule.operator === 'not_exists') {
    return appendOutputHint(`${rule.variablePath} ${operator}`, rule.outputVariablePath)
  }
  return appendOutputHint(`${rule.variablePath} ${operator} ${rule.compareValue || ''}`.trim(), rule.outputVariablePath)
}

function appendOutputHint(text: string, outputVariablePath?: string) {
  if (!outputVariablePath) {
    return text
  }
  return `${text} => ${outputVariablePath}`
}

function resolveEdgeLabel(
  sourceNode: { id: string; data: WorkflowNodeData } | undefined,
  targetNodeId: string,
  frameworkType: string
) {
  if (!sourceNode) return ''

  if (sourceNode.data.type === 'CONDITION') {
    const rules = Array.isArray(sourceNode.data.config.conditionRules)
      ? (sourceNode.data.config.conditionRules as ConditionRule[])
      : []
    const matchedRules = rules
      .filter((rule) => rule.nextNodeId === targetNodeId)
      .map(formatConditionRule)

    const isDefault = sourceNode.data.config.defaultNextNodeId === targetNodeId
    if (matchedRules.length === 0 && !isDefault) {
      return ''
    }

    const ruleText = matchedRules.join(' / ')
    if (isDefault && ruleText) {
      return `${ruleText} | 默认`
    }
    if (isDefault) {
      return sourceNode.data.config.defaultOutputVariablePath
        ? `默认分支 => ${String(sourceNode.data.config.defaultOutputVariablePath)}`
        : '默认分支'
    }
    return ruleText
  }

  if (frameworkType === 'LANGGRAPH4J' && sourceNode.data.config.langGraphRouting) {
    const routing = sourceNode.data.config.langGraphRouting
    const rules = Array.isArray(routing.rules) ? routing.rules : []
    const matchedRules = rules
      .filter((rule) => rule.nextNodeId === targetNodeId)
      .map((rule) => {
        const mode = rule.matchType === 'equals' ? '=' : rule.matchType === 'regex' ? '正则' : '包含'
        return `${mode}:${rule.matchValue}`
      })
    const isDefault = routing.defaultNextNodeId === targetNodeId
    if (matchedRules.length === 0 && !isDefault) {
      return ''
    }
    const ruleText = matchedRules.join(' / ')
    if (isDefault && ruleText) {
      return `${ruleText} | 默认`
    }
    if (isDefault) {
      return '默认分支'
    }
    return ruleText
  }

  return ''
}

const edgeTypes = {
  conditionEdge: ConditionEdge,
}

export default function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useFlowStore()
  const selectNode = useUIStore((s) => s.selectNode)
  const workflowFrameworkType = useWorkflowStore((s) => s.workflowFrameworkType)

  const renderedEdges = useMemo(
    () =>
      edges.map((edge) => {
        const sourceNode = nodes.find((node) => node.id === edge.source)
        const sourceData = sourceNode?.data as WorkflowNodeData | undefined

        return {
          ...edge,
          type: 'conditionEdge',
          data: {
            ...(edge.data || {}),
            label: resolveEdgeLabel(
              sourceData ? { id: sourceNode!.id, data: sourceData } : undefined,
              edge.target,
              workflowFrameworkType
            ),
          },
        }
      }),
    [edges, nodes, workflowFrameworkType]
  )

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData('application/paiagent-node')
      if (!raw || !reactFlowInstance.current || !reactFlowWrapper.current) return

      const item = JSON.parse(raw)
      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })

      addNode(
        item.type,
        item.subtype,
        item.label,
        position,
        defaultConfig[item.subtype] || {}
      )
    },
    [addNode]
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={renderedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={CustomConnectionLine}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{ width: 140, height: 100 }}
        />
      </ReactFlow>
    </div>
  )
}
