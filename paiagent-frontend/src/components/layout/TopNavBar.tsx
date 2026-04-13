import { useCallback, useState } from 'react'
import {
  Plus, FolderOpen, Save, Play, LogOut, User, Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFlowStore } from '@/stores/useFlowStore'
import { useUIStore } from '@/stores/useUIStore'
import { useWorkflowStore } from '@/stores/useWorkflowStore'
import { workflowApi } from '@/api/workflowApi'
import type { WorkflowDTO, WorkflowFrameworkType, WorkflowNodeData } from '@/types/workflow'

export default function TopNavBar() {
  const toggleDebug = useUIStore((s) => s.toggleDebugDrawer)
  const { nodes, edges, clearAll, setNodes, setEdges } = useFlowStore()
  const {
    workflowId,
    workflowName,
    workflowFrameworkType,
    setWorkflow,
    setWorkflowName,
    setWorkflowFrameworkType,
    reset: resetWorkflow,
  } = useWorkflowStore()
  const [saving, setSaving] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)
  const [workflows, setWorkflows] = useState<WorkflowDTO[]>([])

  const handleNew = useCallback(() => {
    clearAll()
    resetWorkflow()
  }, [clearAll, resetWorkflow])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const payload: WorkflowDTO = {
        name: workflowName,
        frameworkType: workflowFrameworkType,
        nodes: nodes.map((n) => ({
          nodeId: n.id,
          type: (n.data as WorkflowNodeData).type,
          subtype: (n.data as WorkflowNodeData).subtype,
          label: (n.data as WorkflowNodeData).label,
          position: n.position,
          config: (n.data as WorkflowNodeData).config,
        })),
        edges: edges.map((e) => ({
          edgeId: e.id,
          sourceNodeId: e.source,
          sourcePort: e.sourceHandle || 'default',
          targetNodeId: e.target,
          targetPort: e.targetHandle || 'default',
        })),
      }

      let result: WorkflowDTO
      if (workflowId) {
        result = await workflowApi.update(workflowId, payload)
      } else {
        result = await workflowApi.create(payload)
      }
      if (result.id) {
        setWorkflow(result.id, result.name, result.description, result.frameworkType || 'DAG')
      }
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }, [workflowId, workflowName, workflowFrameworkType, nodes, edges, setWorkflow])

  const handleLoad = useCallback(async () => {
    try {
      const list = await workflowApi.list()
      setWorkflows(list)
      setShowLoadModal(true)
    } catch (err) {
      console.error('Load failed:', err)
    }
  }, [])

  const handleLoadWorkflow = useCallback(
    async (id: number) => {
      try {
        const wf = await workflowApi.get(id)
        setWorkflow(wf.id!, wf.name, wf.description, wf.frameworkType || 'DAG')

        const flowNodes = wf.nodes.map((n) => ({
          id: n.nodeId,
          type:
            n.type === 'INPUT' ? 'inputNode'
            : n.type === 'OUTPUT' ? 'outputNode'
            : n.type === 'LLM' ? 'llmNode'
            : n.type === 'CONDITION' ? 'conditionNode'
            : 'toolNode',
          position: n.position,
          data: {
            label: n.label,
            type: n.type as WorkflowNodeData['type'],
            subtype: n.subtype,
            config: n.config,
          },
        }))

        const flowEdges = wf.edges.map((e) => ({
          id: e.edgeId,
          source: e.sourceNodeId,
          sourceHandle: e.sourcePort,
          target: e.targetNodeId,
          targetHandle: e.targetPort,
          type: 'smoothstep' as const,
          animated: true,
        }))

        setNodes(flowNodes)
        setEdges(flowEdges)
        setShowLoadModal(false)
      } catch (err) {
        console.error('Load workflow failed:', err)
      }
    },
    [setWorkflow, setNodes, setEdges]
  )

  return (
    <>
      <header
        className="flex h-12 items-center justify-between px-4 shadow-nav"
        style={{ background: 'var(--gradient-nav)' }}
      >
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary-foreground" />
            <span className="text-sm font-bold text-primary-foreground tracking-wide">
              PaiAgent
            </span>
          </div>
          <div className="h-5 w-px bg-primary-foreground/20" />
          <select
            value={workflowFrameworkType}
            onChange={(e) => setWorkflowFrameworkType(e.target.value as WorkflowFrameworkType)}
            className="rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-2 py-1 text-xs text-primary-foreground outline-none transition-colors hover:bg-primary-foreground/15"
            title="选择工作流执行框架"
          >
            <option value="DAG" className="text-foreground">DAG</option>
            <option value="LANGGRAPH4J" className="text-foreground">LangGraph4j</option>
          </select>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent text-sm text-primary-foreground/90 outline-none placeholder:text-primary-foreground/50 w-40 border-b border-transparent focus:border-primary-foreground/30 transition-colors"
            placeholder="工作流名称"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <NavButton icon={<Plus className="h-3.5 w-3.5" />} label="新建" onClick={handleNew} />
          <NavButton icon={<FolderOpen className="h-3.5 w-3.5" />} label="加载" onClick={handleLoad} />
          <NavButton
            icon={<Save className="h-3.5 w-3.5" />}
            label={saving ? '保存中...' : '保存'}
            onClick={handleSave}
            variant="blue"
            disabled={saving}
          />
          <NavButton
            icon={<Play className="h-3.5 w-3.5" />}
            label="调试"
            onClick={toggleDebug}
            variant="green"
          />
          <div className="h-5 w-px bg-primary-foreground/20 mx-1" />
          <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
            <User className="h-3.5 w-3.5" />
            <span>admin</span>
          </div>
          <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
            <LogOut className="h-3 w-3" />
            登出
          </button>
        </div>
      </header>

      {/* Load Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 animate-fade-in">
          <div className="w-[480px] rounded-lg border border-border bg-card shadow-lg animate-node-appear">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h3 className="text-sm font-semibold text-foreground">加载工作流</h3>
              <button
                onClick={() => setShowLoadModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4">
              {workflows.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  暂无已保存的工作流
                </p>
              ) : (
                <div className="space-y-2">
                  {workflows.map((wf) => (
                    <button
                      key={wf.id}
                      onClick={() => handleLoadWorkflow(wf.id!)}
                      className="w-full rounded-md border border-border p-3 text-left hover:bg-accent hover:border-primary/30 transition-all"
                    >
                      <div className="text-sm font-medium text-foreground">{wf.name}</div>
                      {wf.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground truncate">
                          {wf.description}
                        </div>
                      )}
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {(wf.frameworkType || 'DAG')} · {wf.nodes?.length || 0} 节点 · {wf.edges?.length || 0} 连线
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function NavButton({
  icon,
  label,
  onClick,
  variant,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  variant?: 'blue' | 'green'
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'blue'
          ? 'bg-[hsl(220,90%,56%)] text-primary-foreground hover:bg-[hsl(220,90%,50%)]'
          : variant === 'green'
            ? 'bg-success text-success-foreground hover:bg-success/90'
            : 'bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20'
      )}
    >
      {icon}
      {label}
    </button>
  )
}
