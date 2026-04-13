import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Brain, Wrench, GripVertical, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NodeItem {
  type: string
  subtype: string
  label: string
  icon: React.ReactNode
}

const llmNodes: NodeItem[] = [
  { type: 'LLM', subtype: 'deepseek', label: 'DeepSeek', icon: <Brain className="h-3.5 w-3.5" /> },
  { type: 'LLM', subtype: 'tongyi', label: '通义千问', icon: <Brain className="h-3.5 w-3.5" /> },
  { type: 'LLM', subtype: 'openai', label: 'OpenAI', icon: <Brain className="h-3.5 w-3.5" /> },
]

const toolNodes: NodeItem[] = [
  { type: 'TOOL', subtype: 'tts', label: '超拟人音频合成', icon: <Wrench className="h-3.5 w-3.5" /> },
]

const logicNodes: NodeItem[] = [
  { type: 'CONDITION', subtype: 'condition', label: '条件分支', icon: <GitBranch className="h-3.5 w-3.5" /> },
]

function NodeCategory({
  title,
  icon,
  items,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  items: NodeItem[]
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const onDragStart = useCallback(
    (event: React.DragEvent, item: NodeItem) => {
      event.dataTransfer.setData('application/paiagent-node', JSON.stringify(item))
      event.dataTransfer.effectAllowed = 'move'
    },
    []
  )

  return (
    <div className="mb-1">
      <button
        className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground/80 hover:bg-accent/50 rounded-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {icon}
        {title}
      </button>
      {isOpen && (
        <div className="ml-2 space-y-0.5 animate-fade-in">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.subtype}`}
              className="draggable-node-item flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-foreground/70"
              draggable
              onDragStart={(e) => onDragStart(e, item)}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/50" />
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NodeLibrary() {
  return (
    <aside className="flex h-full w-[220px] flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">节点库</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-2">
        <NodeCategory
          title="大模型节点"
          icon={<Brain className="h-3.5 w-3.5 text-node-llm" />}
          items={llmNodes}
        />
        <NodeCategory
          title="工具节点"
          icon={<Wrench className="h-3.5 w-3.5 text-node-tool" />}
          items={toolNodes}
        />
        <NodeCategory
          title="逻辑节点"
          icon={<GitBranch className="h-3.5 w-3.5 text-node-output" />}
          items={logicNodes}
        />
      </div>

      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[10px] text-muted-foreground text-center">
          拖拽节点到画布中使用
        </p>
      </div>
    </aside>
  )
}
