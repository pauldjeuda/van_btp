import { api } from './api';

export const dailyReportService = {
  getAll: async (filters?: { projectId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    const res = await api.get<{ data: any[] }>(`/api/daily-reports${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/daily-reports', payload)).data,
  update: async (id: number, payload: any) => (await api.put<{ data: any }>(`/api/daily-reports/${id}`, payload)).data,
};
