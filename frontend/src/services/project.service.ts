/**
 * @file project.service.ts
 * Service projets — branché sur le backend via GET/POST/PUT/DELETE /api/projects
 */

import { api } from './api';
import { Project } from '../types/models';

export const projectService = {
  getAll: async (filters?: { region?: string; status?: string }): Promise<Project[]> => {
    const params = new URLSearchParams(filters as Record<string, string>).toString();
    const res = await api.get<{ data: Project[] }>(`/api/projects${params ? '?' + params : ''}`);
    return res.data;
  },

  getById: async (id: number): Promise<Project> => {
    const res = await api.get<{ data: Project }>(`/api/projects/${id}`);
    return res.data;
  },

  create: async (project: Omit<Project, 'id'>): Promise<Project> => {
    const res = await api.post<{ data: Project }>('/api/projects', project);
    return res.data;
  },

  update: async (id: number, updates: Partial<Project>): Promise<Project> => {
    const res = await api.put<{ data: Project }>(`/api/projects/${id}`, updates);
    return res.data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/api/projects/${id}`);
  },

  // Utilitaires locaux (pas d'appel réseau)
  filter: (projects: Project[], region?: string, status?: string): Project[] =>
    projects.filter(p => {
      const matchRegion = !region || region === 'Toutes les régions' || p.region === region;
      const matchStatus = !status || p.status === status;
      return matchRegion && matchStatus;
    }),

  getGlobalProgress: (projects: Project[]): number => {
    if (!projects.length) return 0;
    return Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length);
  },

  getBudgetTotal: (projects: Project[]): number =>
    projects.reduce((s, p) => s + p.budget, 0),
};
