import { api } from './api';

export const attendanceService = {
  getAll: async (filters?: { projectId?: number; date?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.date)      params.set('date', filters.date);
    if (filters?.status)    params.set('status', filters.status);
    const res = await api.get<{ data: any[] }>(`/api/attendance${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  bulkCreate: async (payload: { projectId: number; date: string; records: any[] }) => {
    const res = await api.post<{ data: any[] }>('/api/attendance/bulk', payload);
    return res.data;
  },
  getHistory: async (employeeId: number) => {
    const res = await api.get<{ data: any[] }>(`/api/attendance/employee/${employeeId}`);
    return res.data;
  },

  // Individuel : pointer pour aujourd'hui
  clockAction: async (payload: { employeeId: number; projectId: number; type: 'arrival' | 'departure' }) => {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    const record: any = { employeeId: payload.employeeId };
    if (payload.type === 'arrival') record.arrivalTime = time;
    else record.departureTime = time;

    const res = await api.post<{ data: any[] }>('/api/attendance/bulk', {
      projectId: payload.projectId,
      date,
      records: [record]
    });
    return { ...res.data, time };
  },

  checkToday: async (employeeId: number) => {
    const date = new Date().toISOString().split('T')[0];
    const res = await api.get<{ data: any[] }>(`/api/attendance?employeeId=${employeeId}&date=${date}`);
    return res.data[0] || null;
  }
};
