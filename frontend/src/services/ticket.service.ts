import { api } from './api';

export interface TicketPayload {
  title: string;
  module?: string;
  priority?: 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
  description: string;
  status?: 'Ouvert' | 'En cours' | 'Résolu' | 'Fermé';
}

export const ticketService = {
  getAll: async (filters?: { status?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.priority) params.set('priority', filters.priority);
    const res = await api.get<{ data: any[] }>(`/api/tickets${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: TicketPayload) => (await api.post<{ data: any }>('/api/tickets', payload)).data,
  update: async (id: number, payload: Partial<TicketPayload>) => (await api.put<{ data: any }>(`/api/tickets/${id}`, payload)).data,
  remove: async (id: number) => { await api.delete(`/api/tickets/${id}`); },
};
