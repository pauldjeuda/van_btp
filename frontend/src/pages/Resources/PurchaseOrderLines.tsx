import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, cn } from '../../components/ui';
import { ITEM_UNITS } from './resources.types';

export type PurchaseLineDraft = {
  key: string;
  item: string;
  qty: string;
  unit: string;
  unitPrice: string;
};

export const createEmptyPurchaseLine = (): PurchaseLineDraft => ({
  key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  item: 'Ciment CPJ 35',
  qty: '',
  unit: ITEM_UNITS['Ciment CPJ 35'] || 'Tonnes',
  unitPrice: '',
});

type Props = {
  lines: PurchaseLineDraft[];
  onChange: (lines: PurchaseLineDraft[]) => void;
};

export const PurchaseOrderLines: React.FC<Props> = ({ lines, onChange }) => {
  const { t } = useTranslation();

  const updateLine = (index: number, patch: Partial<PurchaseLineDraft>) => {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => onChange([...lines, createEmptyPurchaseLine()]);

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((_, i) => i !== index));
  };

  const lineTotal = (line: PurchaseLineDraft) =>
    Number(line.qty || 0) * Number(line.unitPrice || 0);

  const orderTotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {t('resources.purchases.lines_title')}
        </h4>
        <Button type="button" variant="outline" size="sm" onClick={addLine} className="font-bold h-8">
          <Plus className="w-4 h-4 mr-1" />
          {t('resources.purchases.add_line')}
        </Button>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => (
          <div
            key={line.key}
            className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('resources.purchases.line_number', { n: index + 1 })}
              </span>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label={t('resources.purchases.remove_line')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">{t('common.designation')}</label>
              <select
                value={line.item}
                onChange={(e) => {
                  const item = e.target.value;
                  updateLine(index, { item, unit: ITEM_UNITS[item] || line.unit });
                }}
                className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {Object.keys(ITEM_UNITS).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label={t('resources.purchases.wizard.qty_label')}
                type="number"
                placeholder="0"
                required
                value={line.qty}
                onChange={(e) => updateLine(index, { qty: e.target.value })}
                min="0.01"
                step="any"
              />
              <Input
                label={t('resources.purchases.wizard.unit_label')}
                value={line.unit}
                onChange={(e) => updateLine(index, { unit: e.target.value })}
              />
              <Input
                label={t('resources.purchases.unit_price')}
                type="number"
                placeholder="0"
                value={line.unitPrice}
                onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                min="0"
                step="1"
              />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">{t('resources.purchases.line_total')}</label>
                <div className="h-11 px-4 flex items-center bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900">
                  {lineTotal(line).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={cn('flex justify-end pt-2 border-t border-slate-100')}>
        <p className="text-sm font-bold text-slate-600">
          {t('resources.purchases.order_total')}{' '}
          <span className="text-slate-900 font-black">{orderTotal.toLocaleString('fr-FR')} FCFA</span>
        </p>
      </div>
    </div>
  );
};
