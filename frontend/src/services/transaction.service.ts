import { api } from './api';

export const transactionService = {
  getAll: async (filters?: { projectId?: number; type?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.type) params.set('type', filters.type);
    if (filters?.status) params.set('status', filters.status);
    const res = await api.get<{ data: any[] }>(`/api/transactions${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/transactions', payload)).data,
  update: async (id: number, payload: any) => (await api.put<{ data: any }>(`/api/transactions/${id}`, payload)).data,
  remove: async (id: number) => { await api.delete(`/api/transactions/${id}`); },
};
