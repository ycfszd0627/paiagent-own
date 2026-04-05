import { useState } from 'react'
import { useFlowStore } from '@/stores/useFlowStore'
import { useUIStore } from '@/stores/useUIStore'
import { Eye, EyeOff, RotateCcw, X } from 'lucide-react'
import type { WorkflowNodeData } from '@/types/workflow'

const llmProviderDefaults: Record<string, Record<string, unknown>> = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: '',
  },
  tongyi: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-max',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: '',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: '',
  },
}

export default function NodeConfigPanel() {
  const [showApiKey, setShowApiKey] = useState(false)
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)
  const isVisible = useUIStore((s) => s.isConfigPanelVisible)
  const selectNode = useUIStore((s) => s.selectNode)
  const nodes = useFlowStore((s) => s.nodes)
  const updateNodeData = useFlowStore((s) => s.updateNodeData)

  if (!isVisible || !selectedNodeId) return null

  const node = nodes.find((n) => n.id === selectedNodeId)
  if (!node) return null

  const data = node.data as WorkflowNodeData
  const providerDefaults = data.subtype ? llmProviderDefaults[data.subtype] : undefined

  const handleConfigChange = (key: string, value: unknown) => {
    updateNodeData(selectedNodeId, {
      config: { ...data.config, [key]: value },
    })
  }

  const handleResetDefaults = () => {
    if (!providerDefaults) return
    updateNodeData(selectedNodeId, {
      config: { ...providerDefaults },
    })
    setShowApiKey(false)
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
            {providerDefaults && (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  恢复默认配置
                </button>
              </div>
            )}
            {providerDefaults && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">模型接口地址</label>
                  <input
                    type="text"
                    value={String(data.config.baseUrl || providerDefaults.baseUrl || '')}
                    onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                    placeholder={String(providerDefaults.baseUrl || '')}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">API 密钥</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={String(data.config.apiKey || '')}
                      onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                      placeholder={`输入 ${data.subtype} API Key`}
                      className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((prev) => !prev)}
                      className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                      title={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">模型名</label>
              <input
                type="text"
                value={String(data.config.model || '')}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                placeholder={String(providerDefaults?.model || '')}
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
              <label className="text-xs font-medium text-muted-foreground">接口地址</label>
              <input
                type="text"
                value={String(data.config.baseUrl || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation')}
                onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
                placeholder="https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">API 密钥</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={String(data.config.apiKey || '')}
                  onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                  placeholder="输入音频合成 API Key"
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                  title={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">模型名称</label>
              <input
                type="text"
                value={String(data.config.model || 'qwen3-tts-flash')}
                onChange={(e) => handleConfigChange('model', e.target.value)}
                placeholder="qwen3-tts-flash"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">voice</label>
              <select
                value={String(data.config.voice || 'Cherry')}
                onChange={(e) => handleConfigChange('voice', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              >
                <option value="Cherry">Cherry</option>
                <option value="Serena">Serena</option>
                <option value="Ethan">Ethan</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">language_type</label>
              <select
                value={String(data.config.language_type || 'Auto')}
                onChange={(e) => handleConfigChange('language_type', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              >
                <option value="Auto">Auto</option>
              </select>
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
