import { useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useFlowStore } from '@/stores/useFlowStore'
import { useUIStore } from '@/stores/useUIStore'
import { nodeTypes } from '@/components/nodes/CustomNodes'

const defaultConfig: Record<string, Record<string, unknown>> = {
  deepseek: { model: 'deepseek-chat', temperature: 0.7, maxTokens: 2048, systemPrompt: '' },
  tongyi: { model: 'qwen-max', temperature: 0.7, maxTokens: 2048, systemPrompt: '' },
  openai: { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 2048, systemPrompt: '' },
  tts: { voice: 'default', speed: 1.0 },
}

export default function FlowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useFlowStore()
  const selectNode = useUIStore((s) => s.selectNode)

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
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
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