import { api } from './api';

export const amendmentService = {
  getAll: async (projectId: number) => {
    const res = await api.get<{ data: any[] }>(`/api/projects/${projectId}/amendments`);
    return res.data;
  },
  create: async (projectId: number, payload: any) => {
    const res = await api.post<{ data: any }>(`/api/projects/${projectId}/amendments`, payload);
    return res.data;
  },
  updateStatus: async (projectId: number, id: number, statut: string) => {
    const res = await api.patch<{ data: any }>(`/api/projects/${projectId}/amendments/${id}/status`, { statut });
    return res.data;
  },
};
