import { api } from './api';

export type BudgetConsumedLevel = 'ok' | 'warning' | 'danger';

export interface ProjectKpiEvolutionPoint {
  period: string;
  monthKey: string;
  expenses: number;
  expensesMonth: number;
  budgetConsumedPct: number;
  progress: number;
  plannedProgress: number | null;
  attendanceDays: number;
}

export interface ProjectKpiTaskBreakdown {
  total: number;
  done: number;
  blocked: number;
  inProgress: number;
  todo: number;
}

export interface ProjectKpis {
  projectId: number;
  progress: number;
  budget: number;
  expenses: number;
  budgetConsumedPct: number;
  budgetConsumedLevel: BudgetConsumedLevel;
  delayDays: number | null;
  attendanceToday: number;
  openIncidents: number;
  criticalIncidents: number;
  tasksTotal: number;
  tasksDone: number;
  tasksBlocked: number;
  tasksOverdue: number;
  logisticsPending: number;
  lastReportDate: string | null;
  reportToday: boolean;
  reportStaleDays: number | null;
  stockMovementsCount: number;
  finance?: {
    encaisse: number;
    tauxMarge: number | null;
    impayesTotal: number;
    depenses: number;
  };
  evolution?: ProjectKpiEvolutionPoint[];
  taskBreakdown?: ProjectKpiTaskBreakdown;
  updatedAt: string;
}

export const projectKpiService = {
  getByProject: async (projectId: number): Promise<ProjectKpis> => {
    const res = await api.get<{ data: ProjectKpis }>(`/api/projects/${projectId}/kpis`);
    return res.data;
  },
};
