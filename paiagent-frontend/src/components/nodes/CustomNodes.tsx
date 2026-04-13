import { memo, useEffect } from 'react'
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from 'reactflow'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/useUIStore'
import type { WorkflowNodeData } from '@/types/workflow'
import { LogIn, LogOut, Brain, Wrench, GitBranch } from 'lucide-react'

const iconMap = {
  INPUT: LogIn,
  OUTPUT: LogOut,
  LLM: Brain,
  TOOL: Wrench,
  CONDITION: GitBranch,
}

const gradientMap: Record<string, string> = {
  INPUT: 'var(--gradient-node-input)',
  OUTPUT: 'var(--gradient-node-output)',
  LLM: 'var(--gradient-node-llm)',
  TOOL: 'var(--gradient-node-tool)',
  CONDITION: 'var(--gradient-node-output)',
}

const colorClassMap: Record<string, string> = {
  INPUT: 'border-node-input/30',
  OUTPUT: 'border-node-output/30',
  LLM: 'border-node-llm/30',
  TOOL: 'border-node-tool/30',
  CONDITION: 'border-node-output/30',
}

const handleClassMap: Record<string, string> = {
  INPUT: '!border-node-input !bg-background',
  OUTPUT: '!border-node-output !bg-background',
  LLM: '!border-node-llm !bg-background',
  TOOL: '!border-node-tool !bg-background',
  CONDITION: '!border-node-output !bg-background',
}

const handleStyleTop = {
  left: '50%',
  top: 0,
  right: 'auto',
  bottom: 'auto',
  transform: 'translate(-50%, -50%)',
} as const

const handleStyleBottom = {
  left: '50%',
  top: 'auto',
  right: 'auto',
  bottom: 0,
  transform: 'translate(-50%, 50%)',
} as const

function HandleMarker({
  type,
  position,
}: {
  type: WorkflowNodeData['type']
  position: 'top' | 'bottom'
}) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute z-[1] h-3 w-3 rounded-full border-2 bg-background',
        handleClassMap[type]
      )}
      style={position === 'top' ? handleStyleTop : handleStyleBottom}
    />
  )
}

function BaseNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const updateNodeInternals = useUpdateNodeInternals()
  const selectNode = useUIStore((s) => s.selectNode)
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)
  const isSelected = selected || selectedNodeId === id
  const Icon = iconMap[data.type] || Brain

  useEffect(() => {
    updateNodeInternals(id)
  }, [id, data.label, data.subtype, data.type, data.config, updateNodeInternals])

  return (
    <div
      className={cn(
        'relative w-[180px] rounded-lg border-2 bg-card transition-all duration-200',
        colorClassMap[data.type],
        isSelected ? 'shadow-node-selected' : 'shadow-node hover:shadow-node-selected'
      )}
      onClick={() => selectNode(id)}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-md px-3 py-2"
        style={{ background: gradientMap[data.type] }}
      >
        <Icon className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
        <span className="text-xs font-semibold text-primary-foreground truncate">
          {data.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {data.subtype && (
          <div className="text-[10px] text-muted-foreground truncate">
            {data.subtype}
          </div>
        )}
        {data.type === 'LLM' && data.config.model && (
          <div className="mt-1 text-[10px] text-muted-foreground truncate">
            模型: {String(data.config.model)}
          </div>
        )}
        {data.type === 'TOOL' && (
          <div className="mt-1 text-[10px] text-muted-foreground truncate">
            模型: {String(data.config.model || 'qwen3-tts-flash')}
          </div>
        )}
        {data.type === 'CONDITION' && (
          <div className="mt-1 text-[10px] text-muted-foreground truncate">
            条件数: {Array.isArray(data.config.conditionRules) ? data.config.conditionRules.length : 0}
          </div>
        )}
      </div>

      {/* Handles */}
      {data.type !== 'INPUT' && (
        <>
          <HandleMarker type={data.type} position="top" />
          <Handle
            type="target"
            position={Position.Top}
            className="!h-4 !w-4 !border-0 !bg-transparent !opacity-100"
            style={handleStyleTop}
          />
        </>
      )}
      {data.type !== 'OUTPUT' && (
        <>
          <HandleMarker type={data.type} position="bottom" />
          <Handle
            type="source"
            position={Position.Bottom}
            className="!h-4 !w-4 !border-0 !bg-transparent !opacity-100"
            style={handleStyleBottom}
          />
        </>
      )}
    </div>
  )
}

export const InputNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} />
))
InputNode.displayName = 'InputNode'

export const OutputNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} />
))
OutputNode.displayName = 'OutputNode'

export const LLMNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} />
))
LLMNode.displayName = 'LLMNode'

export const ToolNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} />
))
ToolNode.displayName = 'ToolNode'

export const ConditionNode = memo((props: NodeProps<WorkflowNodeData>) => (
  <BaseNode {...props} />
))
ConditionNode.displayName = 'ConditionNode'

export const nodeTypes = {
  inputNode: InputNode,
  outputNode: OutputNode,
  llmNode: LLMNode,
  toolNode: ToolNode,
  conditionNode: ConditionNode,
}
