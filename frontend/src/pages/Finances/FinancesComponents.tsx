/**
 * FinancesComponents.tsx
 * Composants réutilisables et utilitaires pour la page Finances.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../components/ui';

export const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

const STATUS_KEYS: Record<string, string> = {
  'Payé': 'finances.status.paid',
  'En attente': 'finances.status.pending',
  'Validé': 'finances.status.validated',
  'Rejeté': 'finances.status.rejected',
  'Non remboursé': 'finances.status.unpaid',
  'Partiellement remboursé': 'finances.status.partial_refund',
  'Remboursé': 'finances.status.refunded',
};

const STATUS_CFG: Record<string, string> = {
  'Payé': 'bg-emerald-100 text-emerald-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Validé': 'bg-blue-100 text-blue-700',
  'Rejeté': 'bg-red-100 text-red-700',
  'Non remboursé': 'bg-red-100 text-red-700',
  'Partiellement remboursé': 'bg-blue-100 text-blue-700',
  'Remboursé': 'bg-emerald-100 text-emerald-700',
};

export const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const label = STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_CFG[status] || 'bg-slate-100 text-slate-600'}`}>
      {label}
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
  const { t } = useTranslation();
  const cfg: Record<string, { key: string; cls: string }> = {
    ok: { key: 'finances.alerts.ok', cls: 'bg-emerald-100 text-emerald-700' },
    warning: { key: 'finances.alerts.warning', cls: 'bg-amber-100 text-amber-700' },
    danger: { key: 'finances.alerts.danger', cls: 'bg-red-100 text-red-700' },
    neutral: { key: 'finances.alerts.neutral', cls: 'bg-slate-100 text-slate-500' },
  };
  const { key, cls } = cfg[alert] || { key: '', cls: 'bg-slate-100 text-slate-600' };
  const label = key ? t(key) : alert;
  return <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', cls)}>{label}</span>;
};
