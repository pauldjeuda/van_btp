import { api } from './api';

export const equipmentService = {
  getAll: async (filters?: { projectId?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.status) params.set('status', filters.status);
    const res = await api.get<{ data: any[] }>(`/api/equipment${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/equipment', payload)).data,
  update: async (id: number, payload: any) => (await api.put<{ data: any }>(`/api/equipment/${id}`, payload)).data,
  remove: async (id: number) => { await api.delete(`/api/equipment/${id}`); },
};
