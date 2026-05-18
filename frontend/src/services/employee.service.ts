import { api } from './api';

export const employeeService = {
  getAll: async (filters?: { projectId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    const res = await api.get<{ data: any[] }>(`/api/employees${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/employees', payload)).data,
  update: async (id: number, payload: any) => (await api.put<{ data: any }>(`/api/employees/${id}`, payload)).data,
  remove: async (id: number) => { await api.delete(`/api/employees/${id}`); },

  /** Désaffecter un employé de son chantier (projectId → null) */
  unassign: async (id: number) => {
    const res = await api.patch<{ data: any }>(`/api/employees/${id}/unassign`, {});
    return res.data;
  },

  /** Affecter un employé à un chantier */
  assign: async (id: number, projectId: number) => {
    const res = await api.put<{ data: any }>(`/api/employees/${id}`, { projectId });
    return res.data;
  },
};
