/**
 * Types pour la page Projets.
 */

export type ProjectView = 'list' | 'gantt' | 'kanban';
export type ProjectTab = 'overview' | 'tasks' | 'finances' | 'team' | 'documents';

export const PROJECT_STATUS_OPTIONS = [
  'Planifié', 'En cours', 'Terminé', 'Suspendu',
] as const;

export const PROJECT_CATEGORIES = [
  'Bâtiment', 'Infrastructure', 'VRD', 'Génie Civil', 'Autre',
] as const;
