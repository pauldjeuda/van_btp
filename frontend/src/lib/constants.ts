/**
 * @file constants.ts
 * Constantes métier partagées dans tout le projet VAN BTP ERP.
 * Centralise les valeurs hardcodées pour faciliter la maintenance.
 */

/** Régions d'opération de VAN BTP */
export const REGIONS = [
  'Centre',
  'Littoral',
  'Ouest',
  'Nord',
  'Adamaoua',
  'Est',
  'Sud',
  'Nord-Ouest',
  'Sud-Ouest',
  'Extrême-Nord',
] as const;

/** Catégories de dépenses */
export const EXPENSE_CATEGORIES = [
  'Ciment',
  'Fer à béton',
  'Bois de coffrage',
  'Gravier',
  'Sable',
  'Carrelage',
  'Peinture',
  'Électricité',
  'Plomberie',
  'Main d\'œuvre',
  'Location engin',
  'Transport',
  'Sous-traitance',
  'Divers',
] as const;

/** Statuts de projet */
export const PROJECT_STATUSES = [
  'Planifié',
  'En cours',
  'Terminé',
  'Suspendu',
] as const;

/** Statuts d'incident */
export const INCIDENT_STATUSES = [
  'Ouvert',
  'En cours de traitement',
  'Résolu',
  'Fermé',
] as const;

/** Gravités d'incident */
export const INCIDENT_GRAVITIES = [
  'Mineur',
  'Modéré',
  'Grave',
  'Critique',
] as const;

/** Types de contrat RH */
export const CONTRACT_TYPES = [
  'CDI',
  'CDD',
  'Intérim',
  'Prestataire',
  'Stage',
] as const;

/** Statuts d'équipement */
export const EQUIPMENT_STATUSES = [
  'Disponible',
  'En mission',
  'En maintenance',
  'En panne',
  'Hors service',
] as const;

/** Météo pour rapports journaliers */
export const WEATHER_OPTIONS = [
  'Ensoleillé',
  'Nuageux',
  'Pluvieux',
  'Orageux',
] as const;

/** Priorités de tickets */
export const TICKET_PRIORITIES = ['Basse', 'Moyenne', 'Haute', 'Critique'] as const;

/** Types de documents GED */
export const DOCUMENT_TYPES = [
  'Plan',
  'Rapport',
  'Contrat',
  'Facture',
  'Permis',
  'Normes',
  'Autre',
] as const;

/** Unités de stock */
export const STOCK_UNITS = ['T', 'Kg', 'L', 'm³', 'm²', 'ml', 'Unité', 'Sac'] as const;

/** Périodes de filtrage tableau de bord */
export const PERIODS = ['T1 2024', 'T2 2024', 'T3 2024', 'T4 2024', 'Annuel 2024'] as const;
