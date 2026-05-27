import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Pencil, BookOpen } from 'lucide-react';
import { Button, Input, Modal } from '../../components/ui';
import { useNotification } from '../../context/NotificationContext';
import { productionService, ProductionRecipe } from '../../services/production.service';
import { PRODUCT_TYPES } from './ProductionComponents';
import { formatQuantityWithUnit } from '../../lib/formatters';

type MaterialOption = { id: number; name: string; unit: string; currentStock?: number };

type LineForm = { materialId: string; quantityPerBatch: string; unit: string };

const emptyLine = (): LineForm => ({ materialId: '', quantityPerBatch: '', unit: '' });

export const ProductionRecipesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [recipes, setRecipes] = useState<ProductionRecipe[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    productType: 'Parpaing',
    expectedOutput: '40',
    outputUnit: 'unité',
    lines: [emptyLine()] as LineForm[],
  });

  const load = async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([
        productionService.getRecipes(),
        productionService.getMaterials(0),
      ]);
      setRecipes(r);
      setMaterials(m);
    } catch {
      notify(t('production.recipes.load_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ingredientMaterials = materials.filter(
    (m) => m.name.trim().toLowerCase() !== form.name.trim().toLowerCase(),
  );

  const openCreate = () => {
    setEditId(null);
    setForm({
      name: '',
      productType: 'Parpaing',
      expectedOutput: '40',
      outputUnit: 'unité',
      lines: [emptyLine()],
    });
    setModalOpen(true);
  };

  const openEdit = (recipe: ProductionRecipe) => {
    setEditId(recipe.id);
    setForm({
      name: recipe.name,
      productType: recipe.productType,
      expectedOutput: String(recipe.expectedOutput),
      outputUnit: recipe.outputUnit || 'unité',
      lines: (recipe.lines || []).map((l) => ({
        materialId: String(l.materialId),
        quantityPerBatch: String(l.quantityPerBatch),
        unit: l.unit || l.material?.unit || '',
      })),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = form.lines
      .filter((l) => l.materialId && Number(l.quantityPerBatch) > 0)
      .map((l, idx) => ({
        materialId: Number(l.materialId),
        quantityPerBatch: Number(l.quantityPerBatch),
        unit: l.unit || undefined,
        sortOrder: idx,
      }));
    if (!form.name.trim() || !Number(form.expectedOutput) || lines.length === 0) {
      notify(t('production.recipes.validation'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        productType: form.productType,
        productLabel: form.name.trim(),
        expectedOutput: Number(form.expectedOutput),
        outputUnit: form.outputUnit,
        lines,
      };
      if (editId) await productionService.updateRecipe(editId, payload);
      else await productionService.createRecipe(payload);
      notify(t('production.recipes.saved'), 'success');
      setModalOpen(false);
      load();
    } catch (err: any) {
      notify(err?.message || t('common.error_generic'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('production.recipes.confirm_delete'))) return;
    try {
      await productionService.deleteRecipe(id);
      notify(t('production.recipes.deleted'), 'success');
      load();
    } catch (err: any) {
      notify(err?.message || t('common.error_generic'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{t('production.recipes.hint')}</p>
        <Button onClick={openCreate} className="font-bold gap-2" size="sm">
          <Plus className="w-4 h-4" /> {t('production.recipes.new')}
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-8">{t('common.loading')}</p>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">{t('production.recipes.empty')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {recipes.map((r) => (
            <div key={r.id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-slate-900">{r.name}</h3>
                  <p className="text-xs text-slate-500">
                    {r.productType} — {t('production.recipes.production_qty')}: {formatQuantityWithUnit(r.expectedOutput, r.outputUnit)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(r)} className="p-2 text-slate-400 hover:text-slate-700">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(r.id)} className="p-2 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <ul className="text-xs space-y-1 text-slate-600">
                {(r.lines || []).map((l) => (
                  <li key={l.id || l.materialId}>
                    • {l.material?.name || `#${l.materialId}`} : {formatQuantityWithUnit(l.quantityPerBatch, l.unit || l.material?.unit)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? t('production.recipes.edit') : t('production.recipes.new')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('production.recipes.name')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder={t('production.recipes.name_placeholder')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">{t('production.product_type')}</label>
              <select
                value={form.productType}
                onChange={(e) => setForm({ ...form, productType: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {PRODUCT_TYPES.map((pt) => <option key={pt}>{pt}</option>)}
              </select>
            </div>
            <Input
              label={t('production.recipes.production_qty')}
              type="number"
              min="0"
              step="any"
              required
              value={form.expectedOutput}
              onChange={(e) => setForm({ ...form, expectedOutput: e.target.value })}
            />
          </div>
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-slate-800">{t('production.recipes.ingredients')}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm({ ...form, lines: [...form.lines, emptyLine()] })}
              >
                <Plus className="w-3 h-3 mr-1" /> {t('production.recipes.add_line')}
              </Button>
            </div>
            {form.lines.map((line, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-6">
                  <select
                    value={line.materialId}
                    onChange={(e) => {
                      const mat = ingredientMaterials.find((m) => m.id === Number(e.target.value));
                      const lines = [...form.lines];
                      lines[i] = { ...lines[i], materialId: e.target.value, unit: mat?.unit || '' };
                      setForm({ ...form, lines });
                    }}
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm"
                    required
                  >
                    <option value="">{t('production.recipes.select_material')}</option>
                    {ingredientMaterials.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <Input
                    label=""
                    type="number"
                    min="0"
                    step="any"
                    placeholder={t('production.recipes.qty_per_batch')}
                    value={line.quantityPerBatch}
                    onChange={(e) => {
                      const lines = [...form.lines];
                      lines[i] = { ...lines[i], quantityPerBatch: e.target.value };
                      setForm({ ...form, lines });
                    }}
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  {form.lines.length > 1 && (
                    <button
                      type="button"
                      className="p-2 text-red-400"
                      onClick={() => setForm({ ...form, lines: form.lines.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={submitting} className="font-bold">{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
