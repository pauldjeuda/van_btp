/**
 * FinancesComponents.tsx
 * Composants réutilisables et utilitaires pour la page Finances.
 */
import React from 'react';
import { cn } from '../../components/ui';

export const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

export const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, string> = {
    'Payé': 'bg-emerald-100 text-emerald-700',
    'En attente': 'bg-amber-100 text-amber-700',
    'Validé': 'bg-blue-100 text-blue-700',
    'Rejeté': 'bg-red-100 text-red-700',
    'Non remboursé': 'bg-red-100 text-red-700',
    'Partiellement remboursé': 'bg-blue-100 text-blue-700',
    'Remboursé': 'bg-emerald-100 text-emerald-700',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
};

export const MarginBar = ({ value }: { value: number }) => {
  const color = value >= 15 ? 'bg-emerald-500' : value >= 5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${value >= 15 ? 'text-emerald-600' : value >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
        {value}%
      </span>
    </div>
  );
};

export const AlertBadge = ({ alert }: { alert: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    ok: { label: 'Sain', cls: 'bg-emerald-100 text-emerald-700' },
    warning: { label: 'Vigilance', cls: 'bg-amber-100 text-amber-700' },
    danger: { label: 'Critique', cls: 'bg-red-100 text-red-700' },
    neutral: { label: 'Sans facture', cls: 'bg-slate-100 text-slate-500' },
  };
  const { label, cls } = cfg[alert] || { label: alert, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};
