/**
 * Types et constantes pour la page Ressources.
 */

export type ResourceTab = 'purchases' | 'stock' | 'equipment' | 'hr' | 'subcontracting' | 'pointage';
export type SubcontractTab = 'contracts' | 'providers';
export type StockMovementType = 'entry' | 'exit' | 'transfer';
export type StockView = 'warehouse' | 'projects';

export interface AttendanceRecord {
  employeeId: number;
  name: string;
  matricule: string;
  role: string;
  arrivalTime: string;
  departureTime: string;
  status: string;
  note: string;
}

export interface NewServiceProviderTask {
  title: string;
  cost: string;
}

export interface NewServiceProvider {
  name: string;
  projectId: number;
  tasks: NewServiceProviderTask[];
}

/** Unités par défaut pour les articles courants du BTP */
export const ITEM_UNITS: Record<string, string> = {
  'Ciment CPJ 35':        'Tonnes',
  'Acier / Fer à béton':  'Tonnes',
  'Pelles':               'Unités',
  'Casques':              'Unités',
  'Sable de Sanaga':      'm3',
  'Gravier':              'm3',
  'Gazole Chantier':      'L',
  'EPI (Casques/Gilets)': 'Kits',
  'Fer à béton 12mm':     'Barres',
  'Brouettes':            'Unités',
  'Gilets de sécurité':   'Unités',
  'Bottes de chantier':   'Paires',
  'Bitume':               'Tonnes',
  'Adjuvant béton':       'L',
  'Peinture Blanche':     'Bidons',
  'Briques de terre cuite': 'Unités',
};

/** Statuts de présence valides */
export const ATTENDANCE_STATUSES = ['Présent', 'Absent', 'Retard', 'Congé', 'Mission'] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];

/** Défaut onglet actif selon le rôle */
export const getDefaultTab = (role: string | null): ResourceTab => {
  if (role === 'Gestionnaire de stocks') return 'stock';
  if (role === 'Chef_chantier' || role === 'Directeur technique') return 'purchases';
  return 'stock';
};
