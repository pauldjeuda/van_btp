import { api } from './api';

export const incidentService = {
  getAll: async (filters?: { projectId?: number; category?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.category) params.set('category', filters.category);
    if (filters?.status) params.set('status', filters.status);
    const res = await api.get<{ data: any[] }>(`/api/incidents${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => {
    if (payload instanceof FormData) {
      return (await api.upload<{ data: any }>('/api/incidents', payload)).data;
    }
    return (await api.post<{ data: any }>('/api/incidents', payload)).data;
  },
  update: async (id: number, payload: any) => (await api.put<{ data: any }>(`/api/incidents/${id}`, payload)).data,
};
