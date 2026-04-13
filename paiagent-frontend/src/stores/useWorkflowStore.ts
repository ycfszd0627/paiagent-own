import { create } from 'zustand'

import type { WorkflowFrameworkType } from '@/types/workflow'

interface WorkflowState {
  workflowId: number | null
  workflowName: string
  workflowDescription: string
  workflowFrameworkType: WorkflowFrameworkType
  setWorkflow: (id: number | null, name: string, description?: string, frameworkType?: WorkflowFrameworkType) => void
  setWorkflowName: (name: string) => void
  setWorkflowFrameworkType: (frameworkType: WorkflowFrameworkType) => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflowId: null,
  workflowName: '未命名工作流',
  workflowDescription: '',
  workflowFrameworkType: 'DAG',

  setWorkflow: (id, name, description = '', frameworkType = 'DAG') =>
    set({
      workflowId: id,
      workflowName: name,
      workflowDescription: description,
      workflowFrameworkType: frameworkType,
    }),

  setWorkflowName: (name) => set({ workflowName: name }),
  setWorkflowFrameworkType: (workflowFrameworkType) => set({ workflowFrameworkType }),

  reset: () =>
    set({
      workflowId: null,
      workflowName: '未命名工作流',
      workflowDescription: '',
      workflowFrameworkType: 'DAG',
    }),
}))
