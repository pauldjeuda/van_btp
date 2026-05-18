import { api } from './api';

export const stockService = {
  getAll: async (filters?: { projectId?: number; type?: string; warehouse?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId !== undefined) params.set('projectId', String(filters.projectId));
    if (filters?.type) params.set('type', filters.type);
    if (filters?.warehouse) params.set('warehouse', filters.warehouse);
    const res = await api.get<{ data: any[] }>(`/api/stock${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/stock', payload)).data,
  remove: async (id: number) => { await api.delete(`/api/stock/${id}`); },
};
