/**
 * @file formatters.ts
 * Fonctions de formatage réutilisables pour l'affichage des données.
 * Montants en FCFA, dates, statuts, pourcentages…
 */

/**
 * Formate un montant en FCFA avec séparateurs de milliers.
 * Ex: 15000000 → "15 000 000 FCFA"
 */
export const formatCFA = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formate un nombre avec séparateurs de milliers (sans devise).
 * Ex: 1500000 → "1 500 000"
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('fr-FR').format(value);
};

/**
 * Formate une date ISO en format lisible FR.
 * Ex: "2024-03-15" → "15 mars 2024"
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
};

/**
 * Formate une date courte.
 * Ex: "2024-03-15" → "15/03/2024"
 */
export const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(dateStr));
};

/**
 * Formate un pourcentage.
 * Ex: 0.75 → "75 %"
 */
export const formatPercent = (value: number, total: number): string => {
  if (!total) return '0 %';
  return `${Math.round((value / total) * 100)} %`;
};

/**
 * Retourne les classes CSS Tailwind pour un badge de statut.
 */
export const getStatusBadgeClass = (status: string): string => {
  const map: Record<string, string> = {
    'En cours': 'bg-blue-100 text-blue-700',
    'Terminé': 'bg-emerald-100 text-emerald-700',
    'En attente': 'bg-amber-100 text-amber-700',
    'Suspendu': 'bg-red-100 text-red-700',
    'Planifié': 'bg-slate-100 text-slate-700',
    'Livré': 'bg-slate-100 text-slate-700',
    'Validé': 'bg-emerald-100 text-emerald-700',
    'Ouvert': 'bg-amber-100 text-amber-700',
    'Fermé': 'bg-emerald-100 text-emerald-700',
    'Résolu': 'bg-blue-100 text-blue-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-500';
};

/**
 * Tronque un texte long avec ellipse.
 * Ex: truncate("Chantier de construction du pont de Yaoundé", 30) → "Chantier de construction du…"
 */
export const truncate = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
};
