import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Package, Droplets, HardHat, Wrench, Box,
  ArrowDownToLine, ArrowUpFromLine, Pencil, AlertTriangle,
} from 'lucide-react';
import { cn } from '../../components/ui';
import { formatNumber } from '../../lib/formatters';
import type { StockMaterialRow, MaterialCategory } from '../../services/material.service';

const CATEGORY_META: Record<
  MaterialCategory,
  { icon: React.ElementType; tone: string; bg: string }
> = {
  Matériaux: { icon: Package, tone: 'text-blue-600', bg: 'bg-blue-50' },
  Carburants: { icon: Droplets, tone: 'text-orange-600', bg: 'bg-orange-50' },
  EPI: { icon: HardHat, tone: 'text-violet-600', bg: 'bg-violet-50' },
  Outillage: { icon: Wrench, tone: 'text-slate-600', bg: 'bg-slate-100' },
  Autre: { icon: Box, tone: 'text-teal-600', bg: 'bg-teal-50' },
};

const STATUS_RING: Record<string, string> = {
  alert: 'from-red-500 to-rose-400',
  ok: 'from-emerald-500 to-teal-400',
  empty: 'from-slate-300 to-slate-400',
};

interface Props {
  row: StockMaterialRow;
  canManage: boolean;
  canEditCatalog: boolean;
  onReceive?: () => void;
  onConsume?: () => void;
  onEdit?: () => void;
}

export function StockMaterialCard({
  row,
  canManage,
  canEditCatalog,
  onReceive,
  onConsume,
  onEdit,
}: Props) {
  const { t } = useTranslation();
  const meta = CATEGORY_META[row.category] || CATEGORY_META.Autre;
  const Icon = meta.icon;
  const ring = STATUS_RING[row.status] || STATUS_RING.ok;

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300',
        'hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-0.5',
        row.status === 'alert' && 'border-red-200/80 ring-1 ring-red-100',
        row.status === 'empty' && 'border-slate-200 opacity-90',
        row.status === 'ok' && 'border-slate-100',
      )}
    >
      <motion.div
        className={cn('absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r opacity-90', ring)}
        initial={false}
      />

      <motion.div className="flex items-start justify-between gap-3 mb-4" initial={false}>
        <div className={cn('p-2.5 rounded-xl shrink-0', meta.bg)}>
          <Icon className={cn('w-5 h-5', meta.tone)} />
        </div>
        <span
          className={cn(
            'text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full',
            row.status === 'alert' && 'bg-red-100 text-red-700',
            row.status === 'empty' && 'bg-slate-100 text-slate-600',
            row.status === 'ok' && 'bg-emerald-100 text-emerald-700',
          )}
        >
          {t(`resources.stock.status_${row.status}`)}
        </span>
      </motion.div>

      <h4 className="text-base font-black text-slate-900 leading-tight line-clamp-2 mb-1">{row.name}</h4>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
        {row.category} · {row.unit}
      </p>

      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {t('resources.stock.col_current')}
          </p>
          <p
            className={cn(
              'text-3xl font-black tracking-tight tabular-nums',
              row.status === 'alert' ? 'text-red-600' : row.status === 'empty' ? 'text-slate-400' : 'text-slate-900',
            )}
          >
            {formatNumber(row.currentStock)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {t('resources.stock.col_threshold')}
          </p>
          <p className="text-sm font-black text-slate-600 tabular-nums">
            {formatNumber(Number(row.alertThreshold))}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <motion.div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5" initial={false}>
          <span>{t('resources.stock.col_level')}</span>
          <span>{Math.round(row.levelPercent)}%</span>
        </motion.div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', ring)}
            style={{ width: `${Math.min(100, row.levelPercent)}%` }}
          />
        </div>
      </div>

      {row.status === 'alert' && (
        <div className="flex items-center gap-2 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {t('resources.stock.kpi_alert_sub')}
        </div>
      )}

      {row.id == null && (
        <p className="text-[9px] font-bold text-slate-400 uppercase mb-3">
          {t('resources.stock.legacy_material')}
        </p>
      )}

      {canManage && row.id != null && (
        <div className="mt-auto pt-3 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onReceive}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wide hover:bg-emerald-100 transition-colors"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            {t('resources.stock.action_receive')}
          </button>
          <button
            type="button"
            onClick={onConsume}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-wide hover:bg-orange-100 transition-colors"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            {t('resources.stock.action_consume')}
          </button>
          {canEditCatalog && (
            <button
              type="button"
              onClick={onEdit}
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              title={t('resources.stock.edit_material')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
