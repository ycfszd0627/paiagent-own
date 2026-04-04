import client from './client'
import type { WorkflowDTO } from '@/types/workflow'

export const workflowApi = {
  list: () => client.get<WorkflowDTO[]>('/workflows').then((r) => r.data),

  get: (id: number) => client.get<WorkflowDTO>(`/workflows/${id}`).then((r) => r.data),

  create: (data: WorkflowDTO) =>
    client.post<WorkflowDTO>('/workflows', data).then((r) => r.data),

  update: (id: number, data: WorkflowDTO) =>
    client.put<WorkflowDTO>(`/workflows/${id}`, data).then((r) => r.data),

  delete: (id: number) => client.delete(`/workflows/${id}`),
}

export const executionApi = {
  execute: (workflowId: number, input: string) =>
    client
      .post(`/workflows/${workflowId}/execute`, { input })
      .then((r) => r.data),

  history: (workflowId: number) =>
    client.get(`/workflows/${workflowId}/executions`).then((r) => r.data),
}

export const nodeTypeApi = {
  list: () => client.get('/node-types').then((r) => r.data),
}