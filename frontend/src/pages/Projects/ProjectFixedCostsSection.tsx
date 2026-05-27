import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Zap, Fuel, Droplets, Wrench, MoreHorizontal } from 'lucide-react';
import { Button, Input, Modal, cn } from '../../components/ui';
import { useNotification } from '../../context/NotificationContext';
import {
  projectFixedCostService,
  ProjectFixedCost,
  FixedCostType,
  FixedCostPeriod,
} from '../../services/projectFixedCost.service';
import { formatNumber } from '../../lib/formatters';

const TYPE_ICONS: Record<FixedCostType, React.FC<{ className?: string }>> = {
  ENEO: Zap,
  Carburant: Fuel,
  Eau: Droplets,
  Maintenance: Wrench,
  Autre: MoreHorizontal,
};

const COST_TYPES: FixedCostType[] = ['ENEO', 'Carburant', 'Eau', 'Maintenance', 'Autre'];
const PERIODS: FixedCostPeriod[] = ['Journalier', 'Hebdomadaire', 'Mensuel', 'Ponctuel'];

interface Props {
  projectId: number;
  canEdit: boolean;
  onSummaryChange?: () => void;
  compact?: boolean;
}

const emptyForm = {
  type: 'ENEO' as FixedCostType,
  label: '',
  amount: '',
  period: 'Mensuel' as FixedCostPeriod,
  notes: '',
};

export const ProjectFixedCostsSection: React.FC<Props> = ({ projectId, canEdit, onSummaryChange, compact = false }) => {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [rows, setRows] = useState<ProjectFixedCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectFixedCost | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await projectFixedCostService.getAll(projectId));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (row: ProjectFixedCost) => {
    setEditing(row);
    setForm({
      type: row.type,
      label: row.label || '',
      amount: String(row.amount),
      period: row.period,
      notes: row.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) < 0) {
      notify(t('projectDetail.fixedCosts.amount_required'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type: form.type,
        label: form.label.trim() || null,
        amount: Number(form.amount),
        period: form.period,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        await projectFixedCostService.update(projectId, editing.id, payload);
        notify(t('projectDetail.fixedCosts.updated'), 'success');
      } else {
        await projectFixedCostService.create(projectId, payload);
        notify(t('projectDetail.fixedCosts.created'), 'success');
      }
      setIsModalOpen(false);
      await load();
      onSummaryChange?.();
    } catch (err: any) {
      notify(err?.message || t('common.error_generic'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await projectFixedCostService.remove(projectId, id);
      notify(t('projectDetail.fixedCosts.deleted'), 'success');
      await load();
      onSummaryChange?.();
    } catch {
      notify(t('common.error_generic'), 'error');
    }
  };

  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);

  const pad = compact ? 'px-4' : 'px-6';
  const cell = compact ? 'px-4 py-2' : 'px-6 py-3';

  return (
    <section
      id="charges-fixes"
      className={cn(
        'bg-white border border-slate-200 shadow-sm overflow-hidden',
        compact ? 'rounded-xl' : 'rounded-2xl',
      )}
    >
      <SectionHeader
        title={t('projectDetail.fixedCosts.title')}
        canEdit={canEdit}
        onAdd={openCreate}
        addLabel={t('projectDetail.fixedCosts.add')}
        compact={compact}
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
        </div>
      ) : rows.length === 0 ? (
        <p className={cn(pad, 'py-6 text-sm text-slate-400 font-medium text-center')}>
          {t('projectDetail.fixedCosts.empty')}
        </p>
      ) : (
        <div className={cn('overflow-x-auto', compact && 'max-h-56 overflow-y-auto')}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-[1]">
              <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className={cell}>{t('projectDetail.fixedCosts.col_type')}</th>
                <th className={cell}>{t('projectDetail.fixedCosts.col_label')}</th>
                <th className={cell}>{t('projectDetail.fixedCosts.col_amount')}</th>
                <th className={cell}>{t('projectDetail.fixedCosts.col_period')}</th>
                {canEdit && <th className={cn(cell, 'text-right')}>{t('common.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => {
                const Icon = TYPE_ICONS[row.type] || MoreHorizontal;
                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className={cell}>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'rounded-lg bg-slate-100 flex items-center justify-center text-slate-500',
                          compact ? 'w-7 h-7' : 'w-8 h-8',
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-800">{row.type}</span>
                      </div>
                    </td>
                    <td className={cn(cell, 'text-slate-600')}>{row.label || '—'}</td>
                    <td className={cn(cell, 'font-black text-slate-900')}>{formatNumber(row.amount)} FCFA</td>
                    <td className={cn(cell, 'text-xs font-bold text-slate-500 uppercase')}>{row.period}</td>
                    {canEdit && (
                      <td className={cn(cell, 'text-right')}>
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => openEdit(row)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(row.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className={cn(pad, 'py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center')}>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {t('projectDetail.fixedCosts.total')}
          </span>
          <span className="text-lg font-black text-slate-900">{formatNumber(total)} FCFA</span>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? t('projectDetail.fixedCosts.edit') : t('projectDetail.fixedCosts.add')}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('projectDetail.fixedCosts.col_type')}</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as FixedCostType }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium"
            >
              {COST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <Input
            label={t('projectDetail.fixedCosts.col_label')}
            value={form.label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, label: e.target.value }))}
            placeholder={t('projectDetail.fixedCosts.label_placeholder')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('projectDetail.fixedCosts.col_amount')}
              type="number"
              min={0}
              required
              value={form.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, amount: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">{t('projectDetail.fixedCosts.col_period')}</label>
              <select
                value={form.period}
                onChange={(e) => setForm((p) => ({ ...p, period: e.target.value as FixedCostPeriod }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium"
              >
                {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('common.notes')}</label>
            <textarea
              value={form.notes}
              rows={2}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" isLoading={submitting}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};

function SectionHeader({
  title,
  canEdit,
  onAdd,
  addLabel,
  compact = false,
}: {
  title: string;
  canEdit: boolean;
  onAdd: () => void;
  addLabel: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'border-b border-slate-100 flex items-center justify-between gap-4',
        compact ? 'px-4 py-2.5' : 'px-6 py-4',
      )}
    >
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">{title}</h3>
      {canEdit && (
        <Button size="sm" onClick={onAdd} className="gap-1.5 text-xs font-bold">
          <Plus className="w-3.5 h-3.5" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
