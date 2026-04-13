import { useMemo, useState } from 'react'
import { useFlowStore } from '@/stores/useFlowStore'
import { useUIStore } from '@/stores/useUIStore'
import { useWorkflowStore } from '@/stores/useWorkflowStore'
import { Eye, EyeOff, RotateCcw, X } from 'lucide-react'
import type {
  ConditionOperator,
  ConditionRule,
  LLMAdditionalInput,
  LLMOutputMode,
  LLMOutputParam,
  LangGraphRouteMatchType,
  LangGraphRouteRule,
  LangGraphRoutingConfig,
  WorkflowNodeData,
} from '@/types/workflow'

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

const conditionVariableSuggestions = [
  'globals.loopCount',
  'globals.结论',
  'globals.qualityConclusion',
  'globals.totalScore',
  'globals.score',
  'lastOutput',
  'system.userInput',
]

export default function NodeConfigPanel() {
  const [showApiKey, setShowApiKey] = useState(false)
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)
  const isVisible = useUIStore((s) => s.isConfigPanelVisible)
  const selectNode = useUIStore((s) => s.selectNode)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const updateNodeData = useFlowStore((s) => s.updateNodeData)
  const workflowFrameworkType = useWorkflowStore((s) => s.workflowFrameworkType)
  const node = nodes.find((n) => n.id === selectedNodeId)
  const data = node?.data as WorkflowNodeData | undefined
  const providerDefaults = data?.subtype ? llmProviderDefaults[data.subtype] : undefined

  const outgoingTargets = useMemo(
    () => edges
      .filter((edge) => edge.source === selectedNodeId)
      .map((edge) => nodes.find((candidate) => candidate.id === edge.target))
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .map((targetNode) => ({
        nodeId: targetNode.id,
        label: (targetNode.data as WorkflowNodeData).label,
      })),
    [edges, nodes, selectedNodeId]
  )
  const conditionVariableOptions = useMemo(
    () => buildConditionVariableOptions(nodes),
    [nodes]
  )
  const isLangGraphRoutingVisible =
    workflowFrameworkType === 'LANGGRAPH4J' &&
    data?.type !== 'CONDITION' &&
    data?.type !== 'OUTPUT' &&
    outgoingTargets.length > 1
  const isConditionConfigVisible = data?.type === 'CONDITION'
  const routingConfig = normalizeRoutingConfig(data?.config.langGraphRouting)
  const conditionRules = normalizeConditionRules(data?.config.conditionRules)
  const outputParams = normalizeOutputParams(data?.config.outputParams)
  const additionalInputs = normalizeAdditionalInputs(data?.config.additionalInputs)
  const defaultConditionNextNodeId =
    typeof data?.config.defaultNextNodeId === 'string' ? data.config.defaultNextNodeId : ''
  const defaultConditionOutputVariablePath =
    typeof data?.config.defaultOutputVariablePath === 'string' ? data.config.defaultOutputVariablePath : ''

  if (!isVisible || !selectedNodeId || !node || !data) return null

  const handleConfigChange = (key: string, value: unknown) => {
    updateNodeData(selectedNodeId, {
      config: { ...data.config, [key]: value },
    })
  }

  const updateRoutingConfig = (nextRouting: LangGraphRoutingConfig) => {
    handleConfigChange('langGraphRouting', nextRouting)
  }

  const handleDefaultRouteChange = (nextNodeId: string) => {
    updateRoutingConfig({
      ...routingConfig,
      defaultNextNodeId: nextNodeId || undefined,
    })
  }

  const handleRouteRuleChange = (
    ruleId: string,
    patch: Partial<LangGraphRouteRule>
  ) => {
    updateRoutingConfig({
      ...routingConfig,
      rules: routingConfig.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule
      ),
    })
  }

  const handleAddRouteRule = () => {
    updateRoutingConfig({
      ...routingConfig,
      rules: [
        ...routingConfig.rules,
        {
          id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          matchType: 'contains',
          matchValue: '',
          nextNodeId: outgoingTargets[0]?.nodeId || '',
        },
      ],
    })
  }

  const handleRemoveRouteRule = (ruleId: string) => {
    updateRoutingConfig({
      ...routingConfig,
      rules: routingConfig.rules.filter((rule) => rule.id !== ruleId),
    })
  }

  const handleResetDefaults = () => {
    if (!providerDefaults) return
    updateNodeData(selectedNodeId, {
      config: {
        ...providerDefaults,
        ...(data.config.langGraphRouting
          ? { langGraphRouting: normalizeRoutingConfig(data.config.langGraphRouting) }
          : {}),
      },
    })
    setShowApiKey(false)
  }

  const updateOutputParams = (nextParams: LLMOutputParam[]) => {
    handleConfigChange('outputParams', nextParams)
  }

  const handleAddOutputParam = () => {
    updateOutputParams([
      ...outputParams,
      {
        id: `output-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: outputParams.length === 0 ? 'totalScore' : `field${outputParams.length + 1}`,
        jsonPath: outputParams.length === 0 ? 'totalScore' : '',
        description: '',
      },
    ])
  }

  const handleOutputParamChange = (
    paramId: string,
    patch: Partial<LLMOutputParam>
  ) => {
    updateOutputParams(
      outputParams.map((param) => (param.id === paramId ? { ...param, ...patch } : param))
    )
  }

  const handleRemoveOutputParam = (paramId: string) => {
    updateOutputParams(outputParams.filter((param) => param.id !== paramId))
  }

  const updateAdditionalInputs = (nextInputs: LLMAdditionalInput[]) => {
    handleConfigChange('additionalInputs', nextInputs)
  }

  const handleAddAdditionalInput = () => {
    updateAdditionalInputs([
      ...additionalInputs,
      {
        id: `input-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        variablePath: conditionVariableOptions[0]?.value || 'globals.totalScore',
        label: '',
      },
    ])
  }

  const handleAdditionalInputChange = (
    inputId: string,
    patch: Partial<LLMAdditionalInput>
  ) => {
    updateAdditionalInputs(
      additionalInputs.map((input) => (input.id === inputId ? { ...input, ...patch } : input))
    )
  }

  const handleRemoveAdditionalInput = (inputId: string) => {
    updateAdditionalInputs(additionalInputs.filter((input) => input.id !== inputId))
  }

  const updateConditionRules = (rules: ConditionRule[]) => {
    handleConfigChange('conditionRules', rules)
  }

  const handleAddConditionRule = () => {
    updateConditionRules([
      ...conditionRules,
      {
        id: `condition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        variablePath: 'globals.loopCount',
        operator: 'less_than',
        compareValue: '3',
        nextNodeId: outgoingTargets[0]?.nodeId || '',
      },
    ])
  }

  const handleConditionRuleChange = (
    ruleId: string,
    patch: Partial<ConditionRule>
  ) => {
    updateConditionRules(
      conditionRules.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule))
    )
  }

  const handleRemoveConditionRule = (ruleId: string) => {
    updateConditionRules(conditionRules.filter((rule) => rule.id !== ruleId))
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
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">输出参数</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    选择 JSON 输出后，模型必须返回合法 JSON，参数会写入全局状态供条件节点读取。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddOutputParam}
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  添加参数
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">输出模式</label>
                <select
                  value={String(data.config.outputMode || 'text')}
                  onChange={(e) => handleConfigChange('outputMode', e.target.value as LLMOutputMode)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                >
                  <option value="text">普通文本</option>
                  <option value="json">结构化 JSON</option>
                </select>
              </div>

              {String(data.config.outputMode || 'text') === 'json' && (
                <>
                  <div className="rounded-md border border-dashed border-input px-3 py-2 text-[11px] text-muted-foreground">
                    例如定义 `totalScore`、`qualityConclusion` 后，条件节点即可用
                    `globals.totalScore`、`globals.qualityConclusion` 判断。
                  </div>
                  {outputParams.length === 0 ? (
                    <div className="rounded-md border border-dashed border-input px-3 py-2 text-xs text-muted-foreground">
                      暂无输出参数。至少添加一个参数，才能强制模型按结构化 JSON 返回。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {outputParams.map((param, index) => (
                        <div key={param.id} className="rounded-md border border-input bg-background p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">参数 {index + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOutputParam(param.id)}
                              className="text-[11px] text-destructive transition-colors hover:text-destructive/80"
                            >
                              删除
                            </button>
                          </div>
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">变量名</label>
                              <input
                                type="text"
                                value={param.name}
                                onChange={(e) =>
                                  handleOutputParamChange(param.id, { name: e.target.value })
                                }
                                placeholder="例如：totalScore"
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">JSON 路径</label>
                              <input
                                type="text"
                                value={param.jsonPath || ''}
                                onChange={(e) =>
                                  handleOutputParamChange(param.id, { jsonPath: e.target.value })
                                }
                                placeholder="例如：totalScore 或 result.score"
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">说明</label>
                              <input
                                type="text"
                                value={param.description || ''}
                                onChange={(e) =>
                                  handleOutputParamChange(param.id, { description: e.target.value })
                                }
                                placeholder="例如：作文总分，0-100"
                                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">附加输入变量</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    除默认上游输入外，还可把全局变量或其他节点输出一并传给模型。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAdditionalInput}
                  className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  添加输入
                </button>
              </div>
              {additionalInputs.length === 0 ? (
                <div className="rounded-md border border-dashed border-input px-3 py-2 text-xs text-muted-foreground">
                  暂无附加输入，当前仅使用默认上游节点输出。
                </div>
              ) : (
                <div className="space-y-3">
                  {additionalInputs.map((input, index) => (
                    <div key={input.id} className="rounded-md border border-input bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">输入 {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdditionalInput(input.id)}
                          className="text-[11px] text-destructive transition-colors hover:text-destructive/80"
                        >
                          删除
                        </button>
                      </div>
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">变量路径</label>
                          <select
                            value={conditionVariableOptions.some((option) => option.value === input.variablePath) ? input.variablePath : '__custom__'}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value === '__custom__') return
                              handleAdditionalInputChange(input.id, { variablePath: value })
                            }}
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                          >
                            {conditionVariableOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            <option value="__custom__">自定义输入...</option>
                          </select>
                          <input
                            type="text"
                            value={input.variablePath}
                            onChange={(e) =>
                              handleAdditionalInputChange(input.id, { variablePath: e.target.value })
                            }
                            placeholder="例如：globals.detail"
                            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">输入标签</label>
                          <input
                            type="text"
                            value={input.label || ''}
                            onChange={(e) =>
                              handleAdditionalInputChange(input.id, { label: e.target.value })
                            }
                            placeholder="例如：质检详情"
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        {isConditionConfigVisible && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">条件分支配置</div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  先把条件节点连到候选目标节点，再配置规则。LangGraph4j 支持回跳形成循环。
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddConditionRule}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                添加条件
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">默认跳转</label>
              <select
                value={defaultConditionNextNodeId}
                onChange={(e) => handleConfigChange('defaultNextNodeId', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              >
                <option value="">未设置</option>
                {outgoingTargets.map((target) => (
                  <option key={target.nodeId} value={target.nodeId}>
                    {target.label} ({target.nodeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">默认输出变量</label>
              <select
                value={conditionVariableOptions.some((option) => option.value === defaultConditionOutputVariablePath) ? defaultConditionOutputVariablePath : '__custom__'}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '__custom__') return
                  handleConfigChange('defaultOutputVariablePath', value)
                }}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              >
                {conditionVariableOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="__custom__">自定义输入...</option>
              </select>
              <input
                type="text"
                value={defaultConditionOutputVariablePath}
                onChange={(e) => handleConfigChange('defaultOutputVariablePath', e.target.value)}
                placeholder="例如：globals.result"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              />
            </div>

            <div className="rounded-md border border-dashed border-input px-3 py-2 text-[11px] text-muted-foreground">
              可读取变量示例：`globals.loopCount`、`globals.结论`、`globals.qualityConclusion`、`lastOutput`、`system.userInput`。
            </div>

            {conditionRules.length === 0 ? (
              <div className="rounded-md border border-dashed border-input px-3 py-2 text-xs text-muted-foreground">
                暂无条件规则。未命中时将走默认跳转；若默认跳转也未设置，执行时会退回第一条出边。
              </div>
            ) : (
              <div className="space-y-3">
                {conditionRules.map((rule, index) => (
                  <div key={rule.id} className="rounded-md border border-input bg-background p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">条件 {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveConditionRule(rule.id)}
                        className="text-[11px] text-destructive transition-colors hover:text-destructive/80"
                      >
                        删除
                      </button>
                    </div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">变量路径</label>
                        <div className="mt-1 space-y-2">
                          <select
                            value={conditionVariableOptions.some((option) => option.value === rule.variablePath) ? rule.variablePath : '__custom__'}
                            onChange={(e) => {
                              const value = e.target.value
                              if (value === '__custom__') return
                              handleConditionRuleChange(rule.id, { variablePath: value })
                            }}
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                          >
                            {conditionVariableOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                            <option value="__custom__">自定义输入...</option>
                          </select>
                          <input
                            type="text"
                            list={`condition-variable-suggestions-${selectedNodeId}`}
                            value={rule.variablePath}
                            onChange={(e) =>
                              handleConditionRuleChange(rule.id, { variablePath: e.target.value })
                            }
                            placeholder="例如：globals.totalScore"
                            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">比较方式</label>
                        <select
                          value={rule.operator}
                          onChange={(e) =>
                            handleConditionRuleChange(rule.id, {
                              operator: e.target.value as ConditionOperator,
                            })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                        >
                          <option value="equals">等于</option>
                          <option value="not_equals">不等于</option>
                          <option value="contains">包含</option>
                          <option value="regex">正则匹配</option>
                          <option value="less_than">小于</option>
                          <option value="less_or_equal">小于等于</option>
                          <option value="greater_than">大于</option>
                          <option value="greater_or_equal">大于等于</option>
                          <option value="exists">存在</option>
                          <option value="not_exists">不存在</option>
                        </select>
                      </div>
                      {rule.operator !== 'exists' && rule.operator !== 'not_exists' && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">比较值</label>
                          <input
                            type="text"
                            value={rule.compareValue || ''}
                            onChange={(e) =>
                              handleConditionRuleChange(rule.id, { compareValue: e.target.value })
                            }
                            placeholder="例如：合格 或 3"
                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">命中后跳转</label>
                        <select
                          value={rule.nextNodeId}
                          onChange={(e) =>
                            handleConditionRuleChange(rule.id, { nextNodeId: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                        >
                          <option value="">未设置</option>
                          {outgoingTargets.map((target) => (
                            <option key={target.nodeId} value={target.nodeId}>
                              {target.label} ({target.nodeId})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">命中后输出变量</label>
                        <select
                          value={conditionVariableOptions.some((option) => option.value === (rule.outputVariablePath || '')) ? (rule.outputVariablePath || '') : '__custom__'}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '__custom__') return
                            handleConditionRuleChange(rule.id, { outputVariablePath: value })
                          }}
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                        >
                          <option value="">沿用条件说明文本</option>
                          {conditionVariableOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                          <option value="__custom__">自定义输入...</option>
                        </select>
                        <input
                          type="text"
                          value={rule.outputVariablePath || ''}
                          onChange={(e) =>
                            handleConditionRuleChange(rule.id, { outputVariablePath: e.target.value })
                          }
                          placeholder="例如：globals.detail"
                          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <datalist id={`condition-variable-suggestions-${selectedNodeId}`}>
              {[...new Set([
                ...conditionVariableSuggestions,
                ...conditionVariableOptions.map((option) => option.value),
              ])].map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
        )}

        {isLangGraphRoutingVisible && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">LangGraph4j 分支路由</div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  当前节点存在多个后继节点，可按输出内容匹配目标分支。
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddRouteRule}
                className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                添加规则
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">默认分支</label>
              <select
                value={routingConfig.defaultNextNodeId || ''}
                onChange={(e) => handleDefaultRouteChange(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
              >
                <option value="">未设置</option>
                {outgoingTargets.map((target) => (
                  <option key={target.nodeId} value={target.nodeId}>
                    {target.label} ({target.nodeId})
                  </option>
                ))}
              </select>
            </div>

            {routingConfig.rules.length === 0 ? (
              <div className="rounded-md border border-dashed border-input px-3 py-2 text-xs text-muted-foreground">
                暂无分支规则。未命中时会走默认分支；若默认分支也未设置，后端会回退到第一条连线。
              </div>
            ) : (
              <div className="space-y-3">
                {routingConfig.rules.map((rule, index) => (
                  <div key={rule.id} className="rounded-md border border-input bg-background p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">规则 {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRouteRule(rule.id)}
                        className="text-[11px] text-destructive transition-colors hover:text-destructive/80"
                      >
                        删除
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">匹配方式</label>
                        <select
                          value={rule.matchType}
                          onChange={(e) =>
                            handleRouteRuleChange(rule.id, {
                              matchType: e.target.value as LangGraphRouteMatchType,
                            })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                        >
                          <option value="contains">包含</option>
                          <option value="equals">完全等于</option>
                          <option value="regex">正则表达式</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          {rule.matchType === 'regex' ? '正则表达式' : '匹配文本'}
                        </label>
                        <input
                          type="text"
                          value={rule.matchValue}
                          onChange={(e) =>
                            handleRouteRuleChange(rule.id, { matchValue: e.target.value })
                          }
                          placeholder={
                            rule.matchType === 'regex'
                              ? '例如：(?s).*需要总结.*'
                              : '输入命中条件'
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">跳转到</label>
                        <select
                          value={rule.nextNodeId}
                          onChange={(e) =>
                            handleRouteRuleChange(rule.id, { nextNodeId: e.target.value })
                          }
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring transition-colors"
                        >
                          {outgoingTargets.map((target) => (
                            <option key={target.nodeId} value={target.nodeId}>
                              {target.label} ({target.nodeId})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

function normalizeRoutingConfig(value: unknown): LangGraphRoutingConfig {
  if (!value || typeof value !== 'object') {
    return { rules: [] }
  }

  const raw = value as Partial<LangGraphRoutingConfig>
  return {
    defaultNextNodeId:
      typeof raw.defaultNextNodeId === 'string' && raw.defaultNextNodeId
        ? raw.defaultNextNodeId
        : undefined,
    rules: Array.isArray(raw.rules)
      ? raw.rules
          .map((rule) => normalizeRoutingRule(rule))
          .filter((rule): rule is LangGraphRouteRule => rule !== null)
      : [],
  }
}

function normalizeRoutingRule(value: unknown): LangGraphRouteRule | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const raw = value as Partial<LangGraphRouteRule>
  if (typeof raw.id !== 'string' || typeof raw.nextNodeId !== 'string') {
    return null
  }

  const matchType = raw.matchType
  const normalizedMatchType: LangGraphRouteMatchType =
    matchType === 'equals' || matchType === 'regex' ? matchType : 'contains'

  return {
    id: raw.id,
    matchType: normalizedMatchType,
    matchValue: typeof raw.matchValue === 'string' ? raw.matchValue : '',
    nextNodeId: raw.nextNodeId,
  }
}

function normalizeConditionRules(value: unknown): ConditionRule[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((rule) => normalizeConditionRule(rule))
    .filter((rule): rule is ConditionRule => rule !== null)
}

function normalizeConditionRule(value: unknown): ConditionRule | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const raw = value as Partial<ConditionRule>
  if (typeof raw.id !== 'string') {
    return null
  }

  return {
    id: raw.id,
    variablePath: typeof raw.variablePath === 'string' ? raw.variablePath : '',
    operator: normalizeConditionOperator(raw.operator),
    compareValue: typeof raw.compareValue === 'string' ? raw.compareValue : '',
    nextNodeId: typeof raw.nextNodeId === 'string' ? raw.nextNodeId : '',
    outputVariablePath: typeof raw.outputVariablePath === 'string' ? raw.outputVariablePath : '',
  }
}

function normalizeConditionOperator(value: unknown): ConditionOperator {
  switch (value) {
    case 'equals':
    case 'not_equals':
    case 'contains':
    case 'regex':
    case 'less_than':
    case 'less_or_equal':
    case 'greater_than':
    case 'greater_or_equal':
    case 'exists':
    case 'not_exists':
      return value
    default:
      return 'equals'
  }
}

function normalizeOutputParams(value: unknown): LLMOutputParam[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((param) => normalizeOutputParam(param))
    .filter((param): param is LLMOutputParam => param !== null)
}

function normalizeOutputParam(value: unknown): LLMOutputParam | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const raw = value as Partial<LLMOutputParam>
  if (typeof raw.id !== 'string') {
    return null
  }

  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : '',
    jsonPath: typeof raw.jsonPath === 'string' ? raw.jsonPath : '',
    description: typeof raw.description === 'string' ? raw.description : '',
  }
}

function normalizeAdditionalInputs(value: unknown): LLMAdditionalInput[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((input) => normalizeAdditionalInput(input))
    .filter((input): input is LLMAdditionalInput => input !== null)
}

function normalizeAdditionalInput(value: unknown): LLMAdditionalInput | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const raw = value as Partial<LLMAdditionalInput>
  if (typeof raw.id !== 'string') {
    return null
  }

  return {
    id: raw.id,
    variablePath: typeof raw.variablePath === 'string' ? raw.variablePath : '',
    label: typeof raw.label === 'string' ? raw.label : '',
  }
}

function buildConditionVariableOptions(
  nodes: Array<{ id: string; data: WorkflowNodeData }>
) {
  const options = conditionVariableSuggestions.map((value) => ({
    value,
    label: value,
  }))

  for (const node of nodes) {
    if (node.data.type !== 'LLM') {
      continue
    }

    const outputParams = normalizeOutputParams(node.data.config.outputParams)
    for (const param of outputParams) {
      if (!param.name) {
        continue
      }

      options.push({
        value: `globals.${param.name}`,
        label: `${node.data.label} -> globals.${param.name}`,
      })
      options.push({
        value: `node.${node.id}.json.${param.jsonPath || param.name}`,
        label: `${node.data.label} -> node.${node.id}.json.${param.jsonPath || param.name}`,
      })
    }
  }

  return dedupeVariableOptions(options)
}

function dedupeVariableOptions(options: Array<{ value: string; label: string }>) {
  const seen = new Set<string>()
  return options.filter((option) => {
    if (seen.has(option.value)) {
      return false
    }
    seen.add(option.value)
    return true
  })
}
