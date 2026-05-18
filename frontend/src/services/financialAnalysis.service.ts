import { api } from './api';

export const financialAnalysisService = {
  getAllKPIs: async () => {
    const res = await api.get<{ data: any }>('/api/finance/kpis');
    return res.data;
  },
  getProjectAnalysis: async (projectId: number) => {
    const res = await api.get<{ data: any }>(`/api/finance/projects/${projectId}/analysis`);
    return res.data;
  },
  sendReminder: async (transactionId: number) => {
    const res = await api.post<{ data: any }>(`/api/finance/transactions/${transactionId}/remind`, {});
    return res.data;
  },
  getAccounting: async (filters?: { projectId?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to)   params.set('to', filters.to);
    const res = await api.get<{ data: any[] }>(`/api/finance/accounting${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
};
