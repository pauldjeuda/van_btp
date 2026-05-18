import { api } from './api';

export const productionService = {
  getDashboard: async () => {
    const res = await api.get<{ data: any }>('/api/production/dashboard');
    return res.data;
  },
  getEntries: async (filters?: { productType?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.productType) params.set('productType', filters.productType);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const res = await api.get<{ data: any[] }>(`/api/production/entries${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  createEntry: async (payload: any) => (await api.post<{ data: any }>('/api/production/entries', payload)).data,
  deleteEntry: async (id: number) => { await api.delete(`/api/production/entries/${id}`); },
  getSales: async (filters?: { productType?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.productType) params.set('productType', filters.productType);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const res = await api.get<{ data: any[] }>(`/api/production/sales${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  createSale: async (payload: any) => (await api.post<{ data: any }>('/api/production/sales', payload)).data,
  deleteSale: async (id: number) => { await api.delete(`/api/production/sales/${id}`); },
};
