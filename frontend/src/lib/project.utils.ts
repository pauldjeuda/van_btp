/**
 * @file project.utils.ts
 * Utilitaires pour la gestion des projets et la résolution des noms
 */

import { Project } from '../types/models';

/**
 * Récupère le nom d'un projet à partir de son ID
 */
export const getProjectNameById = (
  projects: { id: number; name: string }[],
  projectId: number
): string => {
  return projects.find(p => p.id === projectId)?.name || 'Chantier inconnu';
};

/**
 * Récupère un projet complet à partir de son ID
 */
export const getProjectById = (
  projects: Project[],
  projectId: number
): Project | null => {
  return projects.find(p => p.id === projectId) || null;
};

/**
 * Vérifie si un ID de projet est valide (différent de 0 et existe dans la liste)
 */
export const isValidProjectId = (
  projects: { id: number }[],
  projectId: number
): boolean => {
  return projectId !== 0 && projects.some(p => p.id === projectId);
};

/**
 * Formate l'affichage d'un projet avec code et nom
 */
export const formatProjectDisplay = (
  projects: Project[],
  projectId: number
): string => {
  const project = getProjectById(projects, projectId);
  if (!project) return 'Chantier inconnu';
  return `${project.code} - ${project.name}`;
};

/**
 * Filtre une liste d'éléments par projet
 */
export const filterByProjectId = <T extends { projectId?: number }>(
  items: T[],
  projectId: number
): T[] => {
  return items.filter(item => item.projectId === projectId);
};
