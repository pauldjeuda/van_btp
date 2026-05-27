import React from 'react';
import { useTranslation } from 'react-i18next';
import { History, ClipboardList } from 'lucide-react';
import { Button, cn } from '../../components/ui';

interface StockCardProps {
  title: string;
  qty: string | number;
  status: 'Normal' | 'Bas' | 'Critique' | 'Vide';
  icon: React.ElementType;
  color: 'blue' | 'amber' | 'emerald' | 'red';
}

const COLOR_MAP = {
  blue: { bg: 'from-blue-500/10 to-blue-600/5', icon: 'bg-blue-100 text-blue-600', ring: 'ring-blue-100' },
  amber: { bg: 'from-amber-500/10 to-amber-600/5', icon: 'bg-amber-100 text-amber-600', ring: 'ring-amber-100' },
  emerald: { bg: 'from-emerald-500/10 to-emerald-600/5', icon: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-100' },
  red: { bg: 'from-red-500/10 to-red-600/5', icon: 'bg-red-100 text-red-600', ring: 'ring-red-100' },
};

export const StockCard = ({ title, qty, status, icon: Icon, color }: StockCardProps) => {
  const { t } = useTranslation();
  const palette = COLOR_MAP[color] || COLOR_MAP.blue;
  const qtyNum = typeof qty === 'string' ? parseFloat(qty.replace(/[^0-9.-]/g, '')) : (qty || 0);
  const isEmpty = qtyNum <= 0;
  const isLow = !isEmpty && status === 'Bas';

  const statusLabel = isEmpty
    ? t('resources.status.empty')
    : status === 'Normal'
      ? t('resources.status.normal')
      : status === 'Bas'
        ? t('resources.status.low')
        : status === 'Critique'
          ? t('resources.status.critical')
          : status;

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5',
        isEmpty ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-100',
        palette.ring,
      )}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none', palette.bg)} />

      <div className="relative flex justify-between items-start mb-5">
        <div className={cn('p-3 rounded-xl', isEmpty ? 'bg-red-100 text-red-600' : palette.icon)}>
          <Icon className="w-6 h-6" />
        </div>
        <span
          className={cn(
            'text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full',
            isEmpty && 'bg-red-100 text-red-700',
            !isEmpty && status === 'Normal' && 'bg-emerald-100 text-emerald-700',
            !isEmpty && status === 'Bas' && 'bg-amber-100 text-amber-700',
            !isEmpty && status !== 'Normal' && status !== 'Bas' && 'bg-red-100 text-red-700',
          )}
        >
          {statusLabel}
        </span>
      </div>

      <p className="relative text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className={cn('relative text-3xl font-black tracking-tight tabular-nums', isEmpty ? 'text-red-600' : 'text-slate-900')}>
        {qty}
      </p>

      {(isEmpty || isLow) && (
        <p className="relative text-[10px] font-bold text-amber-700 mt-2">
          {isEmpty ? 'Réapprovisionnement nécessaire' : 'Stock bas — surveiller'}
        </p>
      )}

      <div className="relative mt-6 flex gap-2 pt-4 border-t border-slate-100/80">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-[10px] font-black h-9 bg-white/80 hover:bg-white"
          onClick={() => window.dispatchEvent(new CustomEvent('open-logbook'))}
        >
          <History className="w-3.5 h-3.5 mr-1" />
          {t('common.history')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-[10px] font-black h-9 bg-white/80 hover:bg-white"
          onClick={() => window.dispatchEvent(new CustomEvent('open-inventory'))}
        >
          <ClipboardList className="w-3.5 h-3.5 mr-1" />
          {t('common.inventory')}
        </Button>
      </div>
    </article>
  );
};
