import { api } from './api';

export type AttendanceAction = 'arrival' | 'departure' | 'absent' | 'half_day' | 'present';

export interface AttendanceFilters {
  projectId?: number;
  employeeId?: number;
  date?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface AttendanceListResponse {
  records: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats?: {
    total: number;
    present: number;
    late: number;
    absent: number;
    halfDay: number;
  };
}

const unwrap = <T>(res: any): T => {
  if (res?.data !== undefined && res?.success !== undefined) return res.data as T;
  return res as T;
};

export const attendanceService = {
  getAll: async (filters?: AttendanceFilters): Promise<AttendanceListResponse> => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.employeeId) params.set('employeeId', String(filters.employeeId));
    if (filters?.date) params.set('date', filters.date);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.fromDate) params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params.set('toDate', filters.toDate);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    const res = await api.get<any>(`/api/attendance${qs ? `?${qs}` : ''}`);
    const data = unwrap<AttendanceListResponse>(res);
    if (Array.isArray(data)) {
      return { records: data, pagination: { page: 1, limit: data.length, total: data.length, totalPages: 1 } };
    }
    return data;
  },

  mark: async (payload: {
    employeeId: number;
    projectId: number;
    action: AttendanceAction;
    date?: string;
  }) => {
    const res = await api.post<any>('/api/attendance/mark', payload);
    return unwrap<any>(res);
  },

  bulkCreate: async (payload: { projectId: number; date: string; records: any[] }) => {
    const res = await api.post<any>('/api/attendance/bulk', payload);
    return unwrap<any[]>(res);
  },

  getHistory: async (employeeId: number, filters?: { fromDate?: string; toDate?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set('fromDate', filters.fromDate);
    if (filters?.toDate) params.set('toDate', filters.toDate);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    const res = await api.get<any>(`/api/attendance/employee/${employeeId}${qs ? `?${qs}` : ''}`);
    return unwrap<{ records: any[]; pagination: AttendanceListResponse['pagination'] }>(res);
  },

  checkToday: async (employeeId: number, projectId?: number) => {
    const date = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({ employeeId: String(employeeId), date });
    if (projectId) params.set('projectId', String(projectId));
    const res = await api.get<any>(`/api/attendance?${params}`);
    const data = unwrap<AttendanceListResponse>(res);
    const records = Array.isArray(data) ? data : data.records || [];
    return records[0] || null;
  },

  getPayrollRecap: async (filters: {
    periodType: 'week' | 'month';
    referenceDate: string;
    projectId?: number;
  }) => {
    const params = new URLSearchParams({
      periodType: filters.periodType,
      referenceDate: filters.referenceDate,
    });
    if (filters.projectId) params.set('projectId', String(filters.projectId));
    const res = await api.get<any>(`/api/attendance/payroll-recap?${params}`);
    return unwrap<any>(res);
  },
};
