/** Liste générique BTP — synchronisée avec backend/utils/defaultProjectTasks.js */
export const DEFAULT_BTP_TASKS = [
  'Préparation et installation de chantier',
  'Terrassement',
  'Fondations',
  'Gros œuvre',
  'Charpente et couverture',
  'Second œuvre',
  'Finitions',
  'Réception provisoire',
] as const;

export type BtpTaskTitle = (typeof DEFAULT_BTP_TASKS)[number];
