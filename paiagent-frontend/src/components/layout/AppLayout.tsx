import TopNavBar from '@/components/layout/TopNavBar'
import NodeLibrary from '@/components/sidebar/NodeLibrary'
import FlowCanvas from '@/components/canvas/FlowCanvas'
import NodeConfigPanel from '@/components/config-panel/NodeConfigPanel'
import DebugDrawer from '@/components/debug/DebugDrawer'
import { ReactFlowProvider } from 'reactflow'

export default function AppLayout() {
  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
        <TopNavBar />
        <div className="flex flex-1 overflow-hidden">
          <NodeLibrary />
          <FlowCanvas />
          <NodeConfigPanel />
        </div>
        <DebugDrawer />
      </div>
    </ReactFlowProvider>
  )
}