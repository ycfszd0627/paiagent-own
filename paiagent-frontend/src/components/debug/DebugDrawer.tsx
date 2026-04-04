import { useCallback } from 'react'
import { X, Send, CheckCircle, AlertCircle, Loader2, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/useUIStore'
import { useDebugStore } from '@/stores/useDebugStore'
import { useFlowStore } from '@/stores/useFlowStore'
import { useWorkflowStore } from '@/stores/useWorkflowStore'
import type { ExecutionStep } from '@/types/workflow'

export default function DebugDrawer() {
  const isOpen = useUIStore((s) => s.isDebugDrawerOpen)
  const closeDrawer = useUIStore((s) => s.closeDebugDrawer)
  const {
    isExecuting,
    steps,
    finalOutput,
    inputText,
    setInputText,
    startExecution,
    addStep,
    updateStep,
    setFinalOutput,
    finishExecution,
    reset,
  } = useDebugStore()
  const nodes = useFlowStore((s) => s.nodes)
  const workflowId = useWorkflowStore((s) => s.workflowId)

  const handleExecute = useCallback(() => {
    if (!inputText.trim() || isExecuting) return

    startExecution()

    // If we have a saved workflow, try SSE stream
    if (workflowId) {
      const eventSource = new EventSource(
        `/api/v1/workflows/${workflowId}/execute/stream`
      )
      // For POST with body we need fetch instead of EventSource
      // Use fetch with SSE reading
      fetch(`/api/v1/workflows/${workflowId}/execute/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputText }),
      })
        .then(async (response) => {
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          if (!reader) return

          let buffer = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.slice(5))
                  if (data.status === 'RUNNING') {
                    addStep({
                      nodeId: data.nodeId,
                      label: data.label,
                      status: 'RUNNING',
                    })
                  } else if (data.status === 'SUCCESS' && data.durationMs !== undefined) {
                    updateStep(data.nodeId, {
                      status: 'SUCCESS',
                      output: data.output,
                      durationMs: data.durationMs,
                    })
                  } else if (data.status === 'FAILED') {
                    updateStep(data.nodeId, {
                      status: 'FAILED',
                      error: data.error,
                    })
                  }
                  if (data.finalOutput) {
                    setFinalOutput(data.finalOutput)
                  }
                } catch {}
              }
            }
          }
          finishExecution()
        })
        .catch(() => {
          finishExecution()
        })
      eventSource.close()
      return
    }

    // Mock execution for unsaved workflows
    const nodeList = nodes.map((n) => ({
      nodeId: n.id,
      label: n.data.label,
    }))

    let idx = 0
    const runNext = () => {
      if (idx >= nodeList.length) {
        setFinalOutput('模拟输出: 工作流执行完成。请先保存工作流后再进行完整调试。')
        finishExecution()
        return
      }
      const current = nodeList[idx]
      addStep({ nodeId: current.nodeId, label: current.label, status: 'RUNNING' })
      setTimeout(() => {
        updateStep(current.nodeId, {
          status: 'SUCCESS',
          output: `[${current.label}] 模拟输出`,
          durationMs: Math.floor(Math.random() * 2000) + 500,
        })
        idx++
        setTimeout(runNext, 300)
      }, 1000 + Math.random() * 1500)
    }
    runNext()
  }, [
    inputText, isExecuting, workflowId, nodes,
    startExecution, addStep, updateStep, setFinalOutput, finishExecution,
  ])

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1" onClick={closeDrawer} />

      {/* Drawer */}
      <div className="w-[400px] bg-card border-l border-border shadow-panel animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">调试工作流</h3>
          <button
            onClick={closeDrawer}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Input */}
        <div className="border-b border-border p-4">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            输入内容
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="输入测试文本..."
              disabled={isExecuting}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-ring resize-none transition-colors disabled:opacity-50"
            />
          </div>
          <button
            onClick={handleExecute}
            disabled={!inputText.trim() || isExecuting}
            className={cn(
              'mt-2 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                执行中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                开始调试
              </>
            )}
          </button>
        </div>

        {/* Execution Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          {steps.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                执行进度
              </h4>
              {steps.map((step) => (
                <StepItem key={step.nodeId} step={step} />
              ))}
            </div>
          )}

          {/* Final Output */}
          {finalOutput && (
            <div className="mt-4 rounded-md border border-border bg-muted/50 p-3">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                输出结果
              </h4>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                {finalOutput}
              </p>
            </div>
          )}
        </div>

        {/* Reset */}
        {steps.length > 0 && !isExecuting && (
          <div className="border-t border-border p-4">
            <button
              onClick={reset}
              className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              重置
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StepItem({ step }: { step: ExecutionStep }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">
        {step.status === 'RUNNING' && (
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        )}
        {step.status === 'SUCCESS' && (
          <CheckCircle className="h-4 w-4 text-success" />
        )}
        {step.status === 'FAILED' && (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
        {step.status === 'PENDING' && (
          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{step.label}</span>
          {step.durationMs !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              {step.durationMs}ms
            </span>
          )}
        </div>
        {step.output && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {step.output}
          </p>
        )}
        {step.error && (
          <p className="mt-1 text-xs text-destructive">{step.error}</p>
        )}
      </div>
    </div>
  )
}