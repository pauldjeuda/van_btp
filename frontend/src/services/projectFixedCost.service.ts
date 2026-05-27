import { api } from './api';

export type FixedCostType = 'ENEO' | 'Carburant' | 'Eau' | 'Maintenance' | 'Autre';
export type FixedCostPeriod = 'Journalier' | 'Hebdomadaire' | 'Mensuel' | 'Ponctuel';

export interface ProjectFixedCost {
  id: number;
  projectId: number;
  type: FixedCostType;
  label?: string | null;
  amount: number;
  period: FixedCostPeriod;
  notes?: string | null;
  createdAt?: string;
}

export interface ProjectCostSummary {
  fixedCostsCount: number;
  totalFixedAmount: number;
  dailyCost: number;
  weeklyCost: number;
}

const unwrap = <T>(res: any): T =>
  (res?.data !== undefined && res?.success !== undefined ? res.data : res) as T;

export const projectFixedCostService = {
  getAll: async (projectId: number): Promise<ProjectFixedCost[]> => {
    const res = await api.get<any>(`/api/projects/${projectId}/fixed-costs`);
    const data = unwrap<ProjectFixedCost[]>(res);
    return Array.isArray(data) ? data.map((r) => ({ ...r, amount: Number(r.amount) })) : [];
  },

  getSummary: async (projectId: number): Promise<ProjectCostSummary> => {
    const res = await api.get<any>(`/api/projects/${projectId}/fixed-costs/summary`);
    return unwrap<ProjectCostSummary>(res);
  },

  create: async (projectId: number, payload: Partial<ProjectFixedCost>): Promise<ProjectFixedCost> => {
    const res = await api.post<any>(`/api/projects/${projectId}/fixed-costs`, payload);
    const row = unwrap<ProjectFixedCost>(res);
    return { ...row, amount: Number(row.amount) };
  },

  update: async (projectId: number, costId: number, payload: Partial<ProjectFixedCost>): Promise<ProjectFixedCost> => {
    const res = await api.put<any>(`/api/projects/${projectId}/fixed-costs/${costId}`, payload);
    const row = unwrap<ProjectFixedCost>(res);
    return { ...row, amount: Number(row.amount) };
  },

  remove: async (projectId: number, costId: number): Promise<void> => {
    await api.delete(`/api/projects/${projectId}/fixed-costs/${costId}`);
  },
};
