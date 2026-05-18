import { api } from './api';

export interface DashboardKpisResponse {
  role: string;
  projects: {
    total: number;
    enCours: number;
    termines: number;
    planifies: number;
    suspendus: number;
    budgetTotal: number;
    progressionMoyenne: number;
  };
  finances: {
    totalDepenses: number;
    totalFactures: number;
    solde: number;
    tauxConsommation: number;
  };
  personnel: { total: number };
  incidents: {
    total: number;
    ouverts: number;
    graves: number;
    hse: number;
    quality: number;
  };
  recentActivity: any[];
}

export const dashboardService = {
  getKPIs: async () => (await api.get<{ data: DashboardKpisResponse }>('/api/dashboard')).data,
};
