import { api } from './api';

export const purchaseService = {
  getAll: async (filters?: { projectId?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.status) params.set('status', filters.status);
    const res = await api.get<{ data: any[] }>(`/api/purchases${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/purchases', payload)).data,
  createBatch: async (payload: {
    projectId: number;
    provider?: string;
    deliveryDate?: string;
    purchaseDate?: string;
    designation?: string;
    priority?: string;
    lines: { item: string; quantity: number; unit?: string; unitPrice?: number }[];
  }) => (await api.post<{ data: { orderRef: string; lines: any[] } }>('/api/purchases/batch', payload)).data,
  updateStatus: async (id: number, payload: any) => (await api.patch<{ data: any }>(`/api/purchases/${id}/status`, payload)).data,
  remove: async (id: number) => { await api.delete(`/api/purchases/${id}`); },
};
