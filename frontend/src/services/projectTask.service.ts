import { api } from './api';

export const projectTaskService = {
  getAll: async (projectId: number) => {
    const res = await api.get<{ data: any[] }>(`/api/projects/${projectId}/tasks`);
    return res.data;
  },
  create: async (projectId: number, payload: any) => {
    const res = await api.post<{ data: any }>(`/api/projects/${projectId}/tasks`, payload);
    return res.data;
  },
  update: async (projectId: number, taskId: number, payload: any) => {
    const res = await api.put<{ data: any }>(`/api/projects/${projectId}/tasks/${taskId}`, payload);
    return res.data;
  },
  updateStatus: async (projectId: number, taskId: number, payload: { status: string; progress?: number }) => {
    const res = await api.patch<{ data: any }>(`/api/projects/${projectId}/tasks/${taskId}/status`, payload);
    return res.data;
  },
  remove: async (projectId: number, taskId: number) => {
    await api.delete(`/api/projects/${projectId}/tasks/${taskId}`);
  },
};
