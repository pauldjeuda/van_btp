import { api } from './api';

export const subcontractService = {
  getAll: async (filters?: { projectId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    const res = await api.get<{ data: any[] }>(`/api/subcontracts${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/subcontracts', payload)).data,
  update: async (id: number, payload: any) => (await api.put<{ data: any }>(`/api/subcontracts/${id}`, payload)).data,
  toggleTask: async (id: number, taskId: string) => (await api.patch<{ data: any }>(`/api/subcontracts/${id}/tasks/${taskId}/toggle`, {})).data,
  remove: async (id: number) => { await api.delete(`/api/subcontracts/${id}`); },
};
