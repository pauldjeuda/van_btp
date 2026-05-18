import { api } from './api';

export const auditService = {
  getAll: async (filters?: { projectId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    const res = await api.get<{ data: any[] }>(`/api/audits${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/audits', payload)).data,
  update: async (id: number, payload: any) => (await api.put<{ data: any }>(`/api/audits/${id}`, payload)).data,
  remove: async (id: number) => { await api.delete(`/api/audits/${id}`); },
};
