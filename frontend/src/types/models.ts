/**
 * @file models.ts
 * Centralise tous les types et interfaces métier du projet VAN BTP ERP.
 * Ces types étaient auparavant éparpillés dans DataContext.tsx.
 */

export interface Project {
  id: number;
  code: string;
  name: string;
  client: string;
  status: string;
  budget: number;
  progress: number;
  location: string;
  region: string;
  /** Champ local normalisé depuis chef.prenom + chef.nom */
  manager?: string;
  /** Champ local alias de startDate */
  start?: string;
  /** Champ local alias de endDate */
  end?: string;
  startDate?: string;
  endDate?: string;
  /** FK vers le Chef responsable du chantier */
  chefId?: number;
  category?: string;
  subCategory?: string | null;
  /** Relation incluse par le backend dans certaines requêtes */
  chef?: { id: number; nom: string; prenom: string; matricule: string };
  /** Montant du marché TTC */
  montantMarche?: number;
  /** Postes budgétaires détaillés */
  budgetItems?: any[];
  /** Date de création du dossier */
  dateCreation?: string;
  /** Nombre d'avenants */
  amendmentCount?: number;
}

export interface Transaction {
  id: number;
  date: string;
  projectId: number;
  category: string;
  provider?: string;
  client?: string;
  amount: number;
  status: string;
  type: 'expense' | 'invoice';
  reference: string;
  paymentMethod: string;
}

export interface IncidentHistory {
  date: string;
  action: string;
  user: string;
}

export interface Incident {
  id: number;
  type: string;
  category: 'hse' | 'quality';
  gravity: string;
  title: string;
  desc: string;
  date: string;
  location: string;
  reporter: string;
  status: string;
  actionPlan: string;
  impact: string;
  image?: string;
  history?: IncidentHistory[];
  projectId: number;
}

export interface Audit {
  id: number;
  title: string;
  date: string;
  auditor: string;
  projectId: number;
}

export interface Employee {
  id: number;
  name: string;
  matricule: string;
  role: string;
  projectId: number;
  contract: string;
  niu: string;
  email?: string;
  avatar?: string;
  assignmentHistory: string[];
}

export interface Equipment {
  id: number;
  name: string;
  ref: string;
  status: string;
  location: string;
  maintenance: string;
  projectId?: number;
}

export interface StockMovement {
  id: number;
  date: string;
  movementDate?: string;
  type: 'Entrée' | 'Sortie' | 'Transfert';
  item: string;
  /** Alias local — le backend stocke quantity (number) */
  qty?: string;
  quantity?: number;
  unit: string;
  projectId: number;
  /** Alias local normalisé depuis userId ou createdBy */
  user?: string;
  createdBy?: number;
  note?: string;
}

export interface Ticket {
  id: number;
  title: string;
  status: string;
  priority: string;
  date: string;
  module?: string;
  description?: string;
  createdAt?: string;
}

export interface Document {
  id: number;
  name: string;
  type: string;
  projectId: number;
  date: string;
  size: string;
}

export interface SubcontractTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Subcontract {
  id: number;
  entreprise: string;
  objet: string;
  montant: number;
  projectId: number;
  date: string;
  tasks: SubcontractTask[];
  progress: number;
}

export interface ChecklistTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Checklist {
  id: number;
  title: string;
  category: string;
  projectId: number;
  tasks: ChecklistTask[];
  active: boolean;
  date: string;
}

export interface DailyReport {
  id: number;
  date: string;
  projectId: number;
  reporter: string;
  location: string;
  weather: string;
  status: string;
}

export interface Purchase {
  id: number;
  ref: string;
  item: string;
  quantity: number;
  unitPrice: number;
  purchaseDate: string;
  status: 'En attente' | 'Validé' | 'Livré' | 'Annulé';
  projectId: number;
  fournisseur?: string;
  createdBy?: number;
}

export interface ProductionEntry {
  id: number;
  productType: string;
  productLabel?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  productionDate: string;
  createdBy?: number;
}

export interface ProductionSale {
  id: number;
  productType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  saleDate: string;
  client?: string;
  createdBy?: number;
}

export interface AttendanceRecord {
  id?: number;
  employeeId: number;
  projectId: number;
  date: string;
  arrivalTime: string;
  departureTime: string;
  status: 'Présent' | 'Absent' | 'Retard' | 'Congé' | 'Mission';
  note?: string;
}

export interface Log {
  id: number;
  action: string;
  module: string;
  entityType: string;
  entityId: number;
  userId: number;
  userRole: string;
  userMatricule: string;
  createdAt: string;
}

export interface RefreshToken {
  id: number;
  token: string;
  userId: number;
  userRole: string;
  expiresAt: string;
  revoked: boolean;
}
