import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/useUIStore'
import type { WorkflowNodeData } from '@/types/workflow'
import { LogIn, LogOut, Brain, Wrench } from 'lucide-react'

const iconMap = {
  INPUT: LogIn,
  OUTPUT: LogOut,
  LLM: Brain,
  TOOL: Wrench,
}

const gradientMap: Record<string, string> = {
  INPUT: 'var(--gradient-node-input)',
  OUTPUT: 'var(--gradient-node-output)',
  LLM: 'var(--gradient-node-llm)',
  TOOL: 'var(--gradient-node-tool)',
}

const colorClassMap: Record<string, string> = {
  INPUT: 'border-node-input/30',
  OUTPUT: 'border-node-output/30',
  LLM: 'border-node-llm/30',
  TOOL: 'border-node-tool/30',
}

function BaseNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const selectNode = useUIStore((s) => s.selectNode)
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)
  const isSelected = selected || selectedNodeId === id
  const Icon = iconMap[data.type] || Brain

  return (
    <div
      className={cn(
        'min-w-[160px] max-w-[200px] rounded-lg border-2 bg-card transition-all duration-200',
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
          <span className="text-[10px] text-muted-foreground">
            {data.subtype}
          </span>
        )}
        {data.type === 'LLM' && data.config.model && (
          <div className="mt-1 text-[10px] text-muted-foreground truncate">
            模型: {String(data.config.model)}
          </div>
        )}
        {data.type === 'TOOL' && (
          <div className="mt-1 text-[10px] text-muted-foreground">
            工具节点
          </div>
        )}
      </div>

      {/* Handles */}
      {data.type !== 'INPUT' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!border-2"
        />
      )}
      {data.type !== 'OUTPUT' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!border-2"
        />
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

export const nodeTypes = {
  inputNode: InputNode,
  outputNode: OutputNode,
  llmNode: LLMNode,
  toolNode: ToolNode,
}