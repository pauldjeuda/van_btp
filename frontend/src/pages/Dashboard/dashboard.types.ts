/**
 * Types pour la page Dashboard.
 */

export type AlertTab = 'active' | 'history';
export type ExportFormat = 'Excel Consolidé (Données Brutes)' | 'PDF Rapport' | 'CSV Simple';

export const DASHBOARD_COLORS = ['#1a365d', '#e11d48', '#0ea5e9', '#10b981'] as const;

export const REGIONS_CAMEROUN = [
  'Toutes les régions',
  'Centre', 'Littoral', 'Ouest', 'Nord-Ouest', 'Sud-Ouest',
  'Nord', 'Adamaoua', 'Est', 'Sud', 'Extrême-Nord',
] as const;
