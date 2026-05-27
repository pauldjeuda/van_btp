import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, MapPin, Truck, Calendar, Package } from 'lucide-react';
import { cn } from '../../components/ui';
import { formatCFA, formatQuantity } from '../../lib/formatters';

type PurchaseRow = {
  id: number;
  orderRef?: string;
  ref?: string;
  item: string;
  quantity?: number;
  qty?: string | number;
  unitPrice?: number;
  total?: number;
  provider?: string;
  status: string;
  projectId: number;
  deliveryDate?: string;
  date?: string;
};

type Props = {
  groups: PurchaseRow[][];
  getProjectName: (projectId: number) => string;
  onConfirmDelivery?: (purchase: PurchaseRow) => void;
};

const lineAmount = (p: PurchaseRow) =>
  p.total ?? Number(p.quantity ?? p.qty ?? 0) * Number(p.unitPrice ?? 0);

const statusClass = (status: string) =>
  status === 'Livré'
    ? 'bg-slate-100 text-slate-700'
    : status === 'Validé'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'Annulé'
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700';

export const PurchaseHistoryAccordion: React.FC<Props> = ({
  groups,
  getProjectName,
  onConfirmDelivery,
}) => {
  const { t } = useTranslation();

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <p className="px-6 py-12 text-center text-sm font-medium text-slate-400">
        {t('resources.purchases.no_orders_found')}
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {groups.map((group) => {
        const head = group[0];
        const groupKey = head.orderRef || head.ref || `single-${head.id}`;
        const displayRef = head.orderRef || head.ref || `BC-${head.id}`;
        const isOpen = expanded.has(groupKey);
        const groupTotal = group.reduce((sum, p) => sum + lineAmount(p), 0);
        const deliveryLabel = head.deliveryDate || head.date || '—';

        return (
          <div key={groupKey} className="bg-white">
            <button
              type="button"
              onClick={() => toggle(groupKey)}
              className="w-full px-4 sm:px-6 py-4 flex items-start sm:items-center gap-4 text-left hover:bg-slate-50/80 transition-colors"
              aria-expanded={isOpen}
            >
              <div
                className={cn(
                  'mt-0.5 sm:mt-0 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200',
                  isOpen ? 'bg-[var(--color-primary)] text-white rotate-180' : 'bg-slate-100 text-slate-500',
                )}
              >
                <ChevronDown className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {t('resources.purchases.ref')}
                  </p>
                  <p className="text-sm font-black text-slate-900 truncate">{displayRef}</p>
                  {group.length > 1 && (
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {t('resources.purchases.line_count', { count: group.length })}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2 min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chantier</p>
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {getProjectName(head.projectId)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 min-w-0">
                  <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {t('resources.purchases.supplier')}
                    </p>
                    <p className="text-xs font-medium text-slate-600 truncate">{head.provider || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {t('resources.purchases.delivery_date')}
                    </p>
                    <p className="text-xs font-medium text-slate-600">{deliveryLabel}</p>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end gap-2 sm:pl-4">
                <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md', statusClass(head.status))}>
                  {head.status}
                </span>
                <p className="text-xs font-black text-slate-900 whitespace-nowrap">
                  {formatCFA(groupTotal)}
                </p>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 sm:px-6 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="ml-8 sm:ml-12 rounded-xl border border-slate-100 overflow-hidden bg-slate-50/50">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px]">
                      <thead>
                        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3">{t('common.designation')}</th>
                          <th className="px-4 py-3 text-right">{t('resources.purchases.table.qty')}</th>
                          <th className="px-4 py-3 text-right">{t('resources.purchases.unit_price')}</th>
                          <th className="px-4 py-3 text-right">Montant (FCFA)</th>
                          {onConfirmDelivery && <th className="px-4 py-3 w-28" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {group.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3 text-xs font-bold text-slate-700">
                              <span className="inline-flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {p.item}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-black text-slate-900 text-right">
                              {formatQuantity(p.quantity ?? p.qty ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-700 text-right">
                              {formatCFA(p.unitPrice || 0)}
                            </td>
                            <td className="px-4 py-3 text-xs font-black text-slate-900 text-right">
                              {formatCFA(lineAmount(p))}
                            </td>
                            {onConfirmDelivery && (
                              <td className="px-4 py-3 text-right">
                                {p.status === 'Validé' && (
                                  <button
                                    type="button"
                                    onClick={() => onConfirmDelivery(p)}
                                    className="text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
                                  >
                                    {t('resources.purchases.mark_delivered')}
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                      {group.length > 1 && (
                        <tfoot>
                          <tr className="bg-slate-50 border-t border-slate-100">
                            <td colSpan={3} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {t('resources.purchases.group_total')}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-black text-slate-900">
                              {groupTotal.toLocaleString('fr-FR')}
                            </td>
                            {onConfirmDelivery && <td />}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
