import { api } from './api';

export const checklistService = {
  getAll: async (filters?: { projectId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    const res = await api.get<{ data: any[] }>(`/api/checklists${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/checklists', payload)).data,
  update: async (id: number, payload: any) => (await api.put<{ data: any }>(`/api/checklists/${id}`, payload)).data,
  toggleTask: async (id: number, taskId: string) => (await api.patch<{ data: any }>(`/api/checklists/${id}/tasks/${taskId}/toggle`, {})).data,
  remove: async (id: number) => { await api.delete(`/api/checklists/${id}`); },
};
