import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  Plus,
  Search,
  History,
  ClipboardList,
  Warehouse,
  Info,
  Building2,
  Download,
  LayoutGrid,
  List,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { Button, Input, Modal, cn } from '../../components/ui';
import { useNotification } from '../../context/NotificationContext';
import {
  materialService,
  StockMaterialRow,
  StockInventoryStats,
  MaterialCategory,
} from '../../services/material.service';
import { formatNumber, formatQuantityWithUnit } from '../../lib/formatters';
import { exportToCSV } from '../../lib/exportUtils';
import { StockMaterialCard } from './StockMaterialCard';

export type StockMovementPreset = 'entry' | 'exit' | 'transfer';

const UNIT_PRESETS = ['Sacs', 'm³', 'L', 'kg', 'Unités', 'Rouleaux', 'Barres', 'Tôles'];
const CATEGORIES: MaterialCategory[] = ['Matériaux', 'Carburants', 'EPI', 'Outillage', 'Autre'];

type MaterialFormState = {
  name: string;
  category: MaterialCategory;
  unit: string;
  alertThreshold: string;
};

const emptyForm = (): MaterialFormState => ({
  name: '',
  category: 'Matériaux',
  unit: '',
  alertThreshold: '',
});

interface Props {
  stockView: 'warehouse' | 'projects';
  setStockView: (v: 'warehouse' | 'projects') => void;
  selectedStockProject: number | null;
  setSelectedStockProject: (id: number | null) => void;
  projects: { id: number; name: string }[];
  stockMovements: any[];
  role: string | null;
  canManageStock: boolean;
  onOpenMovement: (material?: StockMaterialRow, preset?: StockMovementPreset) => void;
  onOpenLogbook: () => void;
  onOpenInventory: () => void;
  stockSearchQuery: string;
  setStockSearchQuery: (q: string) => void;
  showViewToggle: boolean;
  siteOnlyMode?: boolean;
  onInventoryChange?: () => void;
}

export const StockManagementPanel: React.FC<Props> = ({
  stockView,
  setStockView,
  selectedStockProject,
  setSelectedStockProject,
  projects,
  stockMovements,
  role,
  canManageStock,
  onOpenMovement,
  onOpenLogbook,
  onOpenInventory,
  stockSearchQuery,
  setStockSearchQuery,
  showViewToggle,
  siteOnlyMode = false,
  onInventoryChange,
}) => {
  const { t } = useTranslation();
  const { notify } = useNotification();

  const [items, setItems] = useState<StockMaterialRow[]>([]);
  const [stats, setStats] = useState<StockInventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StockMaterialRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<MaterialFormState>(emptyForm);
  const [categoryFilter, setCategoryFilter] = useState<MaterialCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const effectiveChantierId = useMemo(() => {
    if (!siteOnlyMode && stockView !== 'projects') return null;
    if (selectedStockProject != null) return selectedStockProject;
    return projects[0]?.id ?? null;
  }, [siteOnlyMode, stockView, selectedStockProject, projects]);

  const inventoryProjectId = useMemo(() => {
    if (siteOnlyMode) return effectiveChantierId;
    if (stockView === 'warehouse') return 0;
    return effectiveChantierId;
  }, [siteOnlyMode, stockView, effectiveChantierId]);

  const isWarehouseView = !siteOnlyMode && stockView === 'warehouse';
  const isSiteStockView = siteOnlyMode || stockView === 'projects';
  const canCreateMaterial = canManageStock && isWarehouseView;
  const canEditCatalog = canManageStock && isWarehouseView;
  const showCatalogHint = canManageStock && !isWarehouseView && !siteOnlyMode && role !== 'Directeur technique';

  useEffect(() => {
    if (!siteOnlyMode && stockView !== 'projects') return;
    if (selectedStockProject != null) return;
    if (projects.length === 0) return;
    setSelectedStockProject(projects[0].id);
  }, [siteOnlyMode, stockView, selectedStockProject, projects, setSelectedStockProject]);

  const loadInventory = useCallback(async () => {
    if (inventoryProjectId === null) {
      setItems([]);
      setStats({ alert: 0, ok: 0, movementsThisMonth: 0, totalMaterials: 0 });
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await materialService.getInventory(inventoryProjectId);
      setItems(data.items);
      setStats(data.stats);
    } catch (err: any) {
      setItems([]);
      setStats(null);
      setLoadError(err?.message || t('resources.stock.load_error'));
    } finally {
      setLoading(false);
    }
  }, [inventoryProjectId, t]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredItems = useMemo(() => {
    const q = stockSearchQuery.trim().toLowerCase();
    return items.filter((m) => {
      const matchQ =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.unit.toLowerCase().includes(q);
      const matchCat = categoryFilter === 'all' || m.category === categoryFilter;
      return matchQ && matchCat;
    });
  }, [items, stockSearchQuery, categoryFilter]);

  const catalogItems = useMemo(
    () => filteredItems.filter((m) => m.id != null),
    [filteredItems],
  );

  const recentMovements = useMemo(() => {
    if (inventoryProjectId === null) return [];
    return stockMovements
      .filter((m) =>
        isWarehouseView ? Number(m.projectId) === 0 : Number(m.projectId) === inventoryProjectId,
      )
      .slice(0, 8);
  }, [stockMovements, inventoryProjectId, isWarehouseView]);

  const scopeLabel = isWarehouseView
    ? t('resources.stock.central_warehouse')
    : projects.find((p) => p.id === selectedStockProject)?.name || t('resources.all_sites');

  const openCreateModal = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setMaterialModalOpen(true);
  };

  const openEditModal = (row: StockMaterialRow) => {
    if (row.id == null) return;
    setEditTarget(row);
    setForm({
      name: row.name,
      category: row.category,
      unit: row.unit,
      alertThreshold: String(row.alertThreshold ?? ''),
    });
    setMaterialModalOpen(true);
  };

  const closeMaterialModal = () => {
    setMaterialModalOpen(false);
    setEditTarget(null);
    setForm(emptyForm());
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.unit.trim()) {
      notify(t('resources.stock.material_required_fields'), 'error');
      return;
    }
    if (!editTarget && !isWarehouseView) {
      notify(t('resources.stock.warehouse_catalog_hint'), 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const threshold = Number(form.alertThreshold || 0);
      if (editTarget?.id) {
        await materialService.update(editTarget.id, {
          name: form.name.trim(),
          category: form.category,
          unit: form.unit.trim(),
          alertThreshold: threshold,
        });
        notify(t('resources.stock.material_updated'), 'success');
      } else {
        await materialService.create({
          name: form.name.trim(),
          category: form.category,
          unit: form.unit.trim(),
          alertThreshold: threshold,
          projectId: 0,
        });
        notify(t('resources.stock.material_created'), 'success');
      }
      closeMaterialModal();
      await loadInventory();
      onInventoryChange?.();
    } catch (err: any) {
      notify(err?.message || t('common.error_generic'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    if (!filteredItems.length) return;
    exportToCSV(
      filteredItems.map((m) => ({
        MATÉRIAU: m.name,
        CATÉGORIE: m.category,
        UNITÉ: m.unit,
        'STOCK ACTUEL': m.currentStock,
        'SEUIL ALERTE': m.alertThreshold,
        ÉTAT: m.status,
      })),
      `inventaire_${inventoryProjectId ?? 'all'}_${new Date().toISOString().split('T')[0]}`,
    );
  };

  const rowKey = (row: StockMaterialRow) =>
    row.id != null ? `m-${row.id}` : `legacy-${row.name}`;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl shadow-slate-900/20"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-emerald-500/10" />
        <motion.div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" initial={false} />

        <div className="relative p-6 md:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300">
                {isWarehouseView ? (
                  <Warehouse className="w-3.5 h-3.5 text-blue-300" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                )}
                {isWarehouseView
                  ? t('resources.stock.warehouse_management')
                  : t('resources.stock.project_logistics')}
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight truncate">{scopeLabel}</h2>
              <p className="text-sm text-slate-400 max-w-lg">
                {isWarehouseView
                  ? t('resources.stock.reserve_inventory')
                  : t('resources.stock.material_tracking')}
              </p>

              {isSiteStockView && projects.length > 0 && (
                <select
                  value={selectedStockProject ?? projects[0]?.id ?? ''}
                  onChange={(e) => setSelectedStockProject(e.target.value ? Number(e.target.value) : null)}
                  className="mt-2 h-11 px-4 min-w-[220px] rounded-xl bg-white/10 border border-white/20 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-white/30"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="text-slate-900">
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <motion.div className="flex flex-col sm:flex-row flex-wrap gap-2 shrink-0" initial={false}>
              {showViewToggle && (
                <div className="flex rounded-xl overflow-hidden border border-white/15 bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStockView('projects');
                      setSelectedStockProject(projects[0]?.id ?? null);
                    }}
                    className={cn(
                      'px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all',
                      stockView === 'projects' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white',
                    )}
                  >
                    {t('resources.tabs.stock')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStockView('warehouse');
                      setSelectedStockProject(null);
                    }}
                    className={cn(
                      'px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all',
                      stockView === 'warehouse' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white',
                    )}
                  >
                    {t('resources.stock.central_warehouse')}
                  </button>
                </div>
              )}

              {canManageStock && (
                <>
                  <Button
                    type="button"
                    onClick={() => onOpenMovement()}
                    disabled={inventoryProjectId == null || catalogItems.length === 0}
                    className="font-black bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    {t('resources.stock.movement_btn')}
                  </Button>
                  {canCreateMaterial && (
                    <Button
                      type="button"
                      variant="outline"
                      className="font-black border-white/30 text-white hover:bg-white/10 bg-transparent"
                      onClick={openCreateModal}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('resources.stock.new_material')}
                    </Button>
                  )}
                </>
              )}
            </motion.div>
          </div>

          {stats && !loadError && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <HeroKpi
                icon={AlertTriangle}
                label={t('resources.stock.kpi_alert')}
                value={stats.alert}
                accent="text-red-400"
                bg="bg-red-500/10 border-red-500/20"
              />
              <HeroKpi
                icon={CheckCircle2}
                label={t('resources.stock.kpi_ok')}
                value={stats.ok}
                accent="text-emerald-400"
                bg="bg-emerald-500/10 border-emerald-500/20"
              />
              <HeroKpi
                icon={TrendingUp}
                label={t('resources.stock.kpi_movements')}
                value={stats.movementsThisMonth}
                accent="text-blue-400"
                bg="bg-blue-500/10 border-blue-500/20"
              />
              <HeroKpi
                icon={Package}
                label={t('resources.stock.kpi_catalog')}
                value={stats.totalMaterials}
                accent="text-amber-400"
                bg="bg-amber-500/10 border-amber-500/20"
              />
            </div>
          )}
        </div>
      </motion.div>

      {showCatalogHint && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50">
          <Info className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900 font-medium flex-1">{t('resources.stock.warehouse_catalog_hint')}</p>
          {showViewToggle && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="font-bold shrink-0 border-amber-300"
              onClick={() => {
                setStockView('warehouse');
                setSelectedStockProject(null);
              }}
            >
              <Warehouse className="w-4 h-4 mr-2" />
              {t('resources.stock.go_to_warehouse')}
            </Button>
          )}
        </div>
      )}

      {loadError && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-red-200 bg-red-50">
          <p className="text-sm font-bold text-red-800">{loadError}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => loadInventory()}>
            Réessayer
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <motion.div className="relative flex-1 min-w-0" initial={false}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            placeholder={t('resources.placeholders.filter_article')}
            value={stockSearchQuery}
            onChange={(e) => setStockSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:bg-white transition-all"
          />
        </motion.div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')} label="Tous" />
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
                label={String(c)}
              />
            ))}
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1" />

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-400',
              )}
              title="Grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-all',
                viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-400',
              )}
              title="Liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" className="font-bold" onClick={exportCsv} disabled={!filteredItems.length}>
            <Download className="w-3.5 h-3.5 mr-1" />
            CSV
          </Button>
          <Button variant="outline" size="sm" className="font-bold" onClick={onOpenLogbook}>
            <History className="w-3.5 h-3.5 mr-1" />
            {t('common.history')}
          </Button>
          <Button variant="outline" size="sm" className="font-bold" onClick={onOpenInventory}>
            <ClipboardList className="w-3.5 h-3.5 mr-1" />
            {t('common.inventory')}
          </Button>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="min-w-0">
          {inventoryProjectId == null && isSiteStockView ? (
            <EmptyState
              icon={Building2}
              message={t('resources.stock.no_project_available')}
            />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="h-10 w-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400">Chargement de l'inventaire…</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={Package}
              message={t('resources.stock.inventory_empty')}
              action={
                canCreateMaterial ? (
                  <Button size="sm" className="font-bold mt-4" onClick={openCreateModal}>
                    <Plus className="w-4 h-4 mr-1" />
                    {t('resources.stock.add_first_material')}
                  </Button>
                ) : undefined
              }
            />
          ) : viewMode === 'grid' ? (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((row) => (
                  <motion.div
                    key={rowKey(row)}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    <StockMaterialCard
                      row={row}
                      canManage={canManageStock}
                      canEditCatalog={canEditCatalog}
                      onReceive={() => onOpenMovement(row, 'entry')}
                      onConsume={() => onOpenMovement(row, 'exit')}
                      onEdit={() => openEditModal(row)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden divide-y divide-slate-50">
              {filteredItems.map((row) => (
                <div
                  key={rowKey(row)}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900">{row.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {row.category} · {row.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <motion.div className="text-right" initial={false}>
                      <p className="text-[10px] font-black text-slate-400 uppercase">{t('resources.stock.col_current')}</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums">{formatNumber(row.currentStock)}</p>
                    </motion.div>
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase px-2 py-1 rounded-full shrink-0',
                        row.status === 'alert' && 'bg-red-100 text-red-700',
                        row.status === 'empty' && 'bg-slate-100 text-slate-600',
                        row.status === 'ok' && 'bg-emerald-100 text-emerald-700',
                      )}
                    >
                      {t(`resources.stock.status_${row.status}`)}
                    </span>
                    {canManageStock && row.id != null && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-[10px] font-bold h-8" onClick={() => onOpenMovement(row, 'entry')}>
                          +
                        </Button>
                        <Button size="sm" variant="outline" className="text-[10px] font-bold h-8" onClick={() => onOpenMovement(row, 'exit')}>
                          −
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline sidebar */}
        <aside className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden h-fit xl:sticky xl:top-4">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-[var(--color-primary)]" />
              {t('resources.stock.recent_movements')}
            </h3>
          </div>
          <div className="p-4 space-y-0 max-h-[520px] overflow-y-auto">
            {recentMovements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 font-medium">{t('resources.stock.no_movements')}</p>
            ) : (
              recentMovements.map((movement, i) => {
                const isOut = movement.type === 'Sortie';
                return (
                  <div key={movement.id ?? i} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < recentMovements.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-100" />
                    )}
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10',
                        isOut ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600',
                      )}
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-xs font-black text-slate-900 truncate">{movement.item}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{movement.type}</p>
                      <p
                        className={cn(
                          'text-xs font-black mt-1 tabular-nums',
                          isOut ? 'text-red-600' : 'text-emerald-600',
                        )}
                      >
                        {isOut ? '−' : '+'}
                        {formatQuantityWithUnit(movement.qty || movement.quantity, movement.unit)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" className="w-full font-bold text-xs" onClick={onOpenLogbook}>
              {t('common.full_log')}
            </Button>
          </div>
        </aside>
      </div>

      {/* Material modal — redesigned */}
      <Modal
        isOpen={materialModalOpen}
        onClose={closeMaterialModal}
        title={editTarget ? t('resources.stock.edit_material') : t('resources.stock.new_material')}
        description={!editTarget ? t('resources.stock.modal_create_hint') : undefined}
        size="md"
      >
        <form onSubmit={handleSaveMaterial} className="space-y-5">
          <Input
            label={t('resources.stock.col_material')}
            value={form.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            autoFocus
          />
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('resources.stock.col_category')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, category: c }))}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-black border transition-all',
                    form.category === c
                      ? 'bg-[var(--color-primary)] text-white border-transparent shadow-md'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Input
              label={t('resources.stock.col_unit')}
              value={form.unit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, unit: e.target.value }))}
              placeholder="Sacs, m³, L..."
              required
            />
            <div className="flex flex-wrap gap-1.5">
              {UNIT_PRESETS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, unit: u }))}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors',
                    form.unit === u
                      ? 'bg-slate-900 text-white border-transparent'
                      : 'bg-slate-50 text-slate-600 border-slate-200',
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <Input
            label={t('resources.stock.col_threshold')}
            type="number"
            min={0}
            value={form.alertThreshold}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setForm((p) => ({ ...p, alertThreshold: e.target.value }))
            }
            hint={t('resources.stock.kpi_alert_sub')}
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={closeMaterialModal}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editTarget ? t('common.save') : t('common.add')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function HeroKpi({
  icon: Icon,
  label,
  value,
  accent,
  bg,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: number;
  accent: string;
  bg: string;
}) {
  return (
    <div className={cn('rounded-2xl border p-4 backdrop-blur-sm', bg)}>
      <Icon className={cn('w-5 h-5 mb-2', accent)} />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn('text-2xl font-black mt-0.5 text-white')}>{value}</p>
    </div>
  );
}

const CategoryChip: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all',
        active
          ? 'bg-slate-900 text-white shadow-md'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
      )}
    >
      {label}
    </button>
  );
};

function EmptyState({
  icon: Icon,
  message,
  action,
}: {
  icon: React.ElementType;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-sm font-bold text-slate-500 text-center">{message}</p>
      {action}
    </div>
  );
}
