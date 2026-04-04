import { useFlowStore } from '@/stores/useFlowStore'
import { useUIStore } from '@/stores/useUIStore'
import { X } from 'lucide-react'
import type { WorkflowNodeData } from '@/types/workflow'

export default function NodeConfigPanel() {
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)
  const isVisible = useUIStore((s) => s.isConfigPanelVisible)
  const selectNode = useUIStore((s) => s.selectNode)
  const nodes = useFlowStore((s) => s.nodes)
  const updateNodeData = useFlowStore((s) => s.updateNodeData)

  if (!isVisible || !selectedNodeId) return null

  const node = nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  const data = node.data as WorkflowNodeData

  const handleConfigChange = (key: string, value: unknown) => {
    updateNodeData(selectedNodeId, {
      config: { ...data.config, [key]: value },
    })
  }

  return (
    <aside className="w-[280px] border-l border-border bg-card shadow-panel animate-fade-in overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">节点配置</h3>
        <button
          onClick={() => selectNode(null)}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Node Name */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">节点名</label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => updateNodeData(selectedNodeId, { label: e.target.value })}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
          />
        </div>

        {/* Node Type */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">类型</label>
          <div className="mt-1 rounded-md border border-input bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            {data.type} {data.subtype ? `/ ${data.subtype}` : ''}
          </div>
        </div>

        {/* LLM Config */}
        {data.type === 'LLM' && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground">模型</label>
              <input
                type="text"
                value={String(data.config.model || '')}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">温度 (Temperature)</label>
              <input
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={Number(data.config.temperature || 0.7)}
                onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">最大 Token 数</label>
              <input
                type="number"
                min={1}
                max={32768}
                value={Number(data.config.maxTokens || 2048)}
                onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">系统提示词</label>
              <textarea
                rows={4}
                value={String(data.config.systemPrompt || '')}
                onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
                placeholder="输入系统提示词..."
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring resize-none transition-colors"
              />
            </div>
          </>
        )}

        {/* Tool Config */}
        {data.type === 'TOOL' && data.subtype === 'tts' && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground">语音</label>
              <select
                value={String(data.config.voice || 'default')}
                onChange={(e) => handleConfigChange('voice', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              >
                <option value="default">默认</option>
                <option value="male-1">男声 1</option>
                <option value="female-1">女声 1</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">语速</label>
              <input
                type="number"
                min={0.5}
                max={2.0}
                step={0.1}
                value={Number(data.config.speed || 1.0)}
                onChange={(e) => handleConfigChange('speed', parseFloat(e.target.value))}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
          </>
        )}

        {/* Port Info */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">端口信息</label>
          <div className="mt-1 space-y-1.5">
            {data.type !== 'INPUT' && (
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-node-input" />
                输入 (input)
              </div>
            )}
            {data.type !== 'OUTPUT' && (
              <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-node-output" />
                输出 (output)
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}