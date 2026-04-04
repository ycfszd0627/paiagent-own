import { create } from 'zustand'

interface WorkflowState {
  workflowId: number | null
  workflowName: string
  workflowDescription: string
  setWorkflow: (id: number | null, name: string, description?: string) => void
  setWorkflowName: (name: string) => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflowId: null,
  workflowName: '未命名工作流',
  workflowDescription: '',

  setWorkflow: (id, name, description = '') =>
    set({ workflowId: id, workflowName: name, workflowDescription: description }),

  setWorkflowName: (name) => set({ workflowName: name }),

  reset: () =>
    set({ workflowId: null, workflowName: '未命名工作流', workflowDescription: '' }),
}))