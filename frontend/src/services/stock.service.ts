import { api } from './api';

const unwrap = <T>(res: any): T =>
  (res?.data !== undefined && res?.success !== undefined ? res.data : res) as T;

export const stockService = {
  getAll: async (filters?: { projectId?: number; type?: string; warehouse?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId !== undefined) params.set('projectId', String(filters.projectId));
    if (filters?.type) params.set('type', filters.type);
    if (filters?.warehouse) params.set('warehouse', filters.warehouse);
    const res = await api.get<any>(`/api/stock${params.toString() ? `?${params}` : ''}`);
    const data = unwrap<any[]>(res);
    return Array.isArray(data) ? data : [];
  },
  create: async (payload: any) => unwrap<any>(await api.post<any>('/api/stock', payload)),
  remove: async (id: number) => { await api.delete(`/api/stock/${id}`); },
};
