import { create } from 'zustand'
import type { ExecutionStep } from '@/types/workflow'

interface DebugState {
  isExecuting: boolean
  steps: ExecutionStep[]
  finalOutput: string
  executionError: string
  audioUrl: string | null
  inputText: string
  setInputText: (text: string) => void
  startExecution: () => void
  addStep: (step: ExecutionStep) => void
  updateStep: (nodeId: string, update: Partial<ExecutionStep>) => void
  setFinalOutput: (output: string) => void
  setExecutionError: (error: string) => void
  setAudioUrl: (url: string | null) => void
  finishExecution: () => void
  reset: () => void
}

export const useDebugStore = create<DebugState>((set, get) => ({
  isExecuting: false,
  steps: [],
  finalOutput: '',
  executionError: '',
  audioUrl: null,
  inputText: '',

  setInputText: (text) => set({ inputText: text }),

  startExecution: () =>
    set({ isExecuting: true, steps: [], finalOutput: '', executionError: '', audioUrl: null }),

  addStep: (step) => set({ steps: [...get().steps, step] }),

  updateStep: (nodeId, update) =>
    set({
      steps: get().steps.map((s) =>
        s.nodeId === nodeId ? { ...s, ...update } : s
      ),
    }),

  setFinalOutput: (output) => set({ finalOutput: output }),
  setExecutionError: (error) => set({ executionError: error }),
  setAudioUrl: (url) => set({ audioUrl: url }),
  finishExecution: () => set({ isExecuting: false }),

  reset: () =>
    set({
      isExecuting: false,
      steps: [],
      finalOutput: '',
      executionError: '',
      audioUrl: null,
      inputText: '',
    }),
}))
