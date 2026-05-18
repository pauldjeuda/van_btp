import { api } from './api';

export const debtService = {
  getAll: async (filters?: { projectId?: number; debtStatus?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId)  params.set('projectId', String(filters.projectId));
    if (filters?.debtStatus) params.set('debtStatus', filters.debtStatus);
    const res = await api.get<{ data: any[] }>(`/api/debts${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  addRepayment: async (transactionId: number, payload: any) => {
    const res = await api.post<{ data: any }>(`/api/debts/${transactionId}/repayments`, payload);
    return res.data;
  },
};
