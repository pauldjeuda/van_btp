/**
 * ProductionComponents.tsx
 * Constantes et types pour la page Production.
 */

export const PRODUCT_TYPES = ['Parpaing', 'Pavé', 'Bordure', 'Hourdi', 'Autre'] as const;
export const PRODUCT_ICONS: Record<string, string> = {
  Parpaing: '', Pavé: '', Bordure: '', Hourdi: '', Autre: ''
};
export const PRODUCT_COLORS: Record<string, string> = {
  Parpaing: 'bg-amber-50 border-amber-200 text-amber-700',
  Pavé: 'bg-blue-50 border-blue-200 text-blue-700',
  Bordure: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Hourdi: 'bg-purple-50 border-purple-200 text-purple-700',
  Autre: 'bg-slate-50 border-slate-200 text-slate-700',
};
export const UNITS = ['unité', 'ml', 'm2', 'm3', 'sac', 'tonne'];
