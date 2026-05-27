import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Factory, ShoppingCart, BarChart3, Plus, Trash2,
  RefreshCw, Filter, Coins, Layers, BookOpen, CheckCircle2,
} from 'lucide-react';
import { Card, Button, Input, Modal, cn } from '../../components/ui';

import { productionService, ProductionRecipe } from '../../services/production.service';
import { useNotification } from '../../context/NotificationContext';
import { PRODUCT_TYPES, PRODUCT_ICONS, PRODUCT_COLORS, UNITS } from './ProductionComponents';
import { ProductionRecipesPanel } from './ProductionRecipesPanel';
import { formatNumber, formatQuantity, formatQuantityWithUnit, formatCFA } from '../../lib/formatters';


export const ProductionPage = () => {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'recettes' | 'fabrication' | 'ventes' | 'comptabilite'>('fabrication');
  const [dashboard, setDashboard] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<ProductionRecipe[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('Tous');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useRecipeMode, setUseRecipeMode] = useState(true);
  const [newEntry, setNewEntry] = useState({
    recipeId: '',
    productType: 'Parpaing', productLabel: '', quantity: '', unit: 'unité',
    unitCost: '', productionDate: new Date().toISOString().split('T')[0], note: '',
    lossQty: '',
  });
  const [newSale, setNewSale] = useState({
    recipeId: '',
    quantity: '',
    unit: 'unité',
    unitPrice: '',
    saleDate: new Date().toISOString().split('T')[0],
    client: '',
    note: '',
  });

  const selectedSaleRecipe = recipes.find((r) => r.id === Number(newSale.recipeId));

  const findSummaryByRecipe = (recipeId: string | number) => {
    const id = Number(recipeId);
    if (!id) return null;
    const recipe = recipes.find((r) => r.id === id);
    const list = dashboard?.summary || [];
    return list.find(
      (s: { recipeId?: number; label?: string }) =>
        s.recipeId === id || (recipe && s.label === recipe.name),
    ) ?? null;
  };

  const openSaleModal = () => {
    const first = recipes[0];
    setNewSale({
      recipeId: first ? String(first.id) : '',
      quantity: '',
      unit: first?.outputUnit || 'unité',
      unitPrice: '',
      saleDate: today,
      client: '',
      note: '',
    });
    setIsSaleModalOpen(true);
  };

  const handleSaleRecipeChange = (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === Number(recipeId));
    setNewSale((p) => ({
      ...p,
      recipeId,
      unit: recipe?.outputUnit || 'unité',
    }));
  };

  const summaryLabel = (item: { label?: string; recipeName?: string; type?: string }) =>
    item.label || item.recipeName || item.type || '';

  const loadData = async () => {
    setLoading(true);
    try {
      const f = { productType: filterType !== 'Tous' ? filterType : undefined, from: filterFrom || undefined, to: filterTo || undefined };
      const [dash, ents, sls, rec] = await Promise.all([
        productionService.getDashboard(),
        productionService.getEntries(f),
        productionService.getSales(f),
        productionService.getRecipes({ active: true }),
      ]);
      setDashboard(dash); setEntries(ents); setSales(sls); setRecipes(rec);
    } catch { notify('Erreur de chargement', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [filterType, filterFrom, filterTo]);

  const runPreview = async () => {
    if (!newEntry.recipeId || !newEntry.quantity) return;
    try {
      const p = await productionService.previewRecipe(Number(newEntry.recipeId), Number(newEntry.quantity));
      setPreview(p);
    } catch (err: any) {
      notify(err?.message || 'Erreur', 'error');
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(newEntry.quantity) <= 0) { notify('Quantité invalide', 'error'); return; }
    setIsSubmitting(true);
    try {
      if (useRecipeMode && newEntry.recipeId) {
        await productionService.createEntry({
          recipeId: Number(newEntry.recipeId),
          quantity: Number(newEntry.quantity),
          productionDate: newEntry.productionDate,
          note: newEntry.note,
          lossQty: Number(newEntry.lossQty || 0),
          projectId: 0,
        });
        notify(t('production.entry_draft_saved'), 'success');
      } else {
        await productionService.createEntry({
          ...newEntry,
          quantity: Number(newEntry.quantity),
          unitCost: Number(newEntry.unitCost || 0),
        });
        notify('Production enregistrée', 'success');
      }
      setIsEntryModalOpen(false);
      setPreview(null);
      setNewEntry({
        recipeId: '', productType: 'Parpaing', productLabel: '', quantity: '', unit: 'unité',
        unitCost: '', productionDate: new Date().toISOString().split('T')[0], note: '',
        lossQty: '',
      });
      loadData();
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleValidateEntry = async (id: number) => {
    try {
      await productionService.validateEntry(id);
      notify(t('production.entry_validated'), 'success');
      loadData();
    } catch (err: any) {
      notify(err?.message || 'Erreur', 'error');
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSale.recipeId) {
      notify(t('production.sale_select_recipe'), 'error');
      return;
    }
    if (!newSale.quantity || !newSale.unitPrice) { notify('Quantité et prix requis', 'error'); return; }
    const qty = Number(newSale.quantity);
    if (qty <= 0) { notify('La quantité doit être supérieure à 0', 'error'); return; }

    const recipe = selectedSaleRecipe;
    if (!recipe) {
      notify(t('production.sale_select_recipe'), 'error');
      return;
    }

    const stockItem = findSummaryByRecipe(newSale.recipeId);
    const stockDispo = stockItem ? stockItem.stock : 0;
    if (qty > stockDispo) {
      notify(
        `${t('production.insufficient_stock')} pour "${recipe.name}" : ${formatNumber(stockDispo)} ${recipe.outputUnit || newSale.unit} disponible(s), vous en demandez ${formatNumber(qty)}.`,
        'error',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await productionService.createSale({
        recipeId: recipe.id,
        productType: recipe.productType,
        productLabel: recipe.name,
        quantity: qty,
        unit: recipe.outputUnit || newSale.unit,
        unitPrice: Number(newSale.unitPrice),
        saleDate: newSale.saleDate,
        client: newSale.client,
        note: newSale.note,
      });
      notify('Vente enregistrée', 'success');
      setIsSaleModalOpen(false);
      setNewSale({
        recipeId: recipes[0] ? String(recipes[0].id) : '',
        quantity: '',
        unit: recipes[0]?.outputUnit || 'unité',
        unitPrice: '',
        saleDate: today,
        client: '',
        note: '',
      });
      loadData();
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const totalRevenue = dashboard?.totalRevenue || 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <Factory className="w-4 h-4" /><span>Unité de Production</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Production VAN BTP</h1>
          <p className="text-slate-500 mt-1">{t('production.subtitle')}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={loadData} className="font-bold h-11 gap-2 bg-white">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </Button>
          <Button onClick={() => setIsEntryModalOpen(true)} className="font-bold h-11 gap-2">
            <Plus className="w-4 h-4" /> {t('production.new_entry')}
          </Button>
          <Button variant="secondary" onClick={openSaleModal} className="font-bold h-11 gap-2">
            <ShoppingCart className="w-4 h-4" /> {t('production.new_sale')}
          </Button>
        </div>
      </div>

      {/* KPIs - Corporate Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Chiffre d\'Affaires', value: formatCFA(totalRevenue), unit: '', icon: Coins, trend: 'Ventes totales encaissées', color: 'blue' },
          { label: 'Catalogue Produits', value: dashboard?.summary?.length || 0, unit: 'Types', icon: Layers, trend: 'Articles actifs', color: 'indigo' },
          { label: 'Volume Production', value: dashboard?.entriesCount || 0, unit: 'Entrées', icon: Factory, trend: 'Fabrications enregistrées', color: 'amber' },
          { label: 'Performance Ventes', value: dashboard?.salesCount || 0, unit: 'Commandes', icon: ShoppingCart, trend: 'Flux de sorties', color: 'emerald' },
        ].map((kpi, i) => (
          <Card key={i} className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all relative overflow-hidden group">
            <div className={cn(
              "absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-125",
              kpi.color === 'blue' ? 'bg-blue-500' : kpi.color === 'indigo' ? 'bg-indigo-500' : kpi.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
            )} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  kpi.color === 'blue' ? 'bg-blue-50 text-blue-600' : kpi.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : kpi.color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                )}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <h4 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mb-1">{kpi.label}</h4>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{kpi.value}</p>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{kpi.unit}</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-slate-300" /> {kpi.trend}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Résumé par produit - Premium Grid */}
      {(dashboard?.summary || []).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white/50 p-4 rounded-2xl border border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--color-primary)]" />
              {t('production.stock_revenue')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboard.summary.map((item: any) => {
              const stockStatus = item.stock <= 50 ? 'Critique' : item.stock <= 200 ? 'Bas' : 'Optimal';
              const title = summaryLabel(item);
              return (
                <Card key={item.key || item.recipeId || item.type} className="p-0 border-none shadow-xl shadow-slate-200/40 overflow-hidden group">
                  <div className={cn("h-1.5 w-full",
                    item.stock <= 50 ? 'bg-red-500' : item.stock <= 200 ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform text-[var(--color-primary)]">
                          <Layers className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-lg leading-tight">{title}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {item.type !== title ? `${item.type} · ` : ''}Unit: {item.unit || 'unité'}
                            {item.pendingDrafts > 0 ? ` · ${item.pendingDrafts} brouillon(s)` : ''}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest",
                        stockStatus === 'Critique' ? 'bg-red-50 text-red-600' : stockStatus === 'Bas' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      )}>
                        {stockStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {[
                        { label: 'Produit', val: item.produced, color: 'slate' },
                        { label: 'Vendu', val: item.sold, color: 'blue' },
                        { label: 'En Stock', val: item.stock, color: item.stock <= 50 ? 'red' : 'emerald' }
                      ].map((stat) => (
                        <div key={stat.label} className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{stat.label}</p>
                          <p className={cn(
                            "text-xl font-black tracking-tighter",
                            stat.color === 'red' ? 'text-red-600' : stat.color === 'emerald' ? 'text-emerald-700' : stat.color === 'blue' ? 'text-blue-600' : 'text-slate-900'
                          )}>
                            {formatNumber(stat.val)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur Stock (Coût)</p>
                        <p className="text-sm font-black text-amber-700">{formatCFA(item.stock * (item.avgUnitCost || item.lastUnitCost || 0))}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">CA Réalisé (Vente)</p>
                        <p className="text-sm font-black text-emerald-700">{formatCFA(item.revenue)}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { key: 'recettes', label: t('production.recipes.tab'), icon: BookOpen },
          { key: 'fabrication', label: 'Fabrication', icon: Factory },
          { key: 'ventes', label: 'Ventes', icon: ShoppingCart },
          { key: 'comptabilite', label: 'Comptabilité', icon: BarChart3 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all',
              activeTab === tab.key ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700')}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-slate-400" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium bg-white">
            <option value="Tous">Tous les types</option>
            {PRODUCT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
          <span className="text-slate-400 text-sm">au</span>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white" />
          {(filterType !== 'Tous' || filterFrom || filterTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterType('Tous'); setFilterFrom(''); setFilterTo(''); }}>{t('common.clear')}</Button>
          )}
        </div>
      </Card>

      {activeTab === 'recettes' && (
        <Card className="p-6">
          <ProductionRecipesPanel />
        </Card>
      )}

      {/* Tableau Fabrication */}
      {activeTab === 'fabrication' && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">{t('production.production_history')}</h2>
            <span className="text-sm text-slate-500">{entries.length} entrée(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>{['Date', 'Article', 'Statut', 'Quantité', 'Coût total', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {entries.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">{t('production.no_production')}</td></tr>}
                {entries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm">{e.productionDate}</td>
                    <td className="px-6 py-4 text-sm font-bold">
                      {e.productLabel || e.productType}
                      {e.recipe?.name && <span className="block text-[10px] text-slate-400">{e.recipe.name}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'text-[10px] font-black uppercase px-2 py-0.5 rounded',
                        e.status === 'validee' ? 'bg-emerald-100 text-emerald-700' :
                        e.status === 'brouillon' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600',
                      )}>
                        {e.status || 'legacy'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-black">{formatQuantityWithUnit(e.quantity, e.unit)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {e.status === 'validee'
                        ? formatCFA(e.totalCost || 0)
                        : `${formatCFA(e.unitCost || 0)}/u`}
                    </td>
                    <td className="px-6 py-4 flex gap-1">
                      {e.status === 'brouillon' && (
                        <button
                          type="button"
                          onClick={() => handleValidateEntry(e.id)}
                          className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"
                          title={t('production.validate_entry')}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {e.status !== 'validee' && (
                        <button onClick={() => productionService.deleteEntry(e.id).then(loadData)} className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tableau Ventes */}
      {activeTab === 'ventes' && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">{t('production.sale_history')}</h2>
            <span className="text-sm text-slate-500">{sales.length} vente(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>{['Date', 'Article', 'Client', 'Qté', 'Prix unit.', 'Total', 'Réf.', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">{t('production.no_sale')}</td></tr>}
                {sales.map((s: any) => {
                  const total = Number(s.quantity) * Number(s.unitPrice);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm">{s.saleDate}</td>
                      <td className="px-6 py-4"><div className="font-bold text-sm">{s.productLabel || s.productType}</div></td>
                      <td className="px-6 py-4 text-sm">{s.client || '—'}</td>
                      <td className="px-6 py-4 text-sm font-black">{formatQuantityWithUnit(s.quantity, s.unit)}</td>
                      <td className="px-6 py-4 text-sm">{formatCFA(s.unitPrice)}</td>
                      <td className="px-6 py-4 text-sm font-black text-emerald-700">{formatCFA(total)}</td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{s.reference || '—'}</td>
                      <td className="px-6 py-4"><button onClick={() => productionService.deleteSale(s.id).then(loadData)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Comptabilité */}
      {activeTab === 'comptabilite' && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-500" /> {t('production.accounting_dashboard')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>{['Article', 'Produit', 'Vendu', 'Stock', 'Prix unit.', 'Recettes', 'Val. stock'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(!dashboard?.summary?.length) && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">{t('common.no_data')}</td></tr>}
                {(dashboard?.summary || []).map((item: any) => (
                  <tr key={item.key || item.recipeId || item.type} className="hover:bg-slate-50">
                    <td className="px-6 py-4"><span className="font-black">{summaryLabel(item)}</span></td>
                    <td className="px-6 py-4 font-bold">{formatNumber(item.produced)}</td>
                    <td className="px-6 py-4 font-bold text-blue-600">{formatNumber(item.sold)}</td>
                    <td className="px-6 py-4"><span className={`font-black text-lg ${item.stock < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatNumber(item.stock)}</span></td>
                    <td className="px-6 py-4 text-slate-600">{formatCFA(item.avgUnitCost || 0)}</td>
                    <td className="px-6 py-4 font-black text-emerald-700">{formatCFA(item.revenue)}</td>
                    <td className="px-6 py-4 font-bold text-amber-700">{formatCFA(item.stock * (item.avgUnitCost || item.lastUnitCost || 0))}</td>
                  </tr>
                ))}
              </tbody>
              {(dashboard?.summary?.length > 0) && (
                <tfoot className="bg-slate-900 text-white">
                  <tr>
                    <td className="px-6 py-4 font-black" colSpan={5}>TOTAL</td>
                    <td className="px-6 py-4 font-black text-emerald-400">{formatCFA(totalRevenue)}</td>
                    <td className="px-6 py-4 font-black text-amber-400">{formatCFA(dashboard.summary.reduce((s: number, i: any) => s + Math.max(0, i.stock) * (i.avgUnitCost || i.lastUnitCost || 0), 0))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* Modal Production */}
      <Modal isOpen={isEntryModalOpen} onClose={() => { setIsEntryModalOpen(false); setPreview(null); }} title={t('production.modals.record_entry')} size="lg">
        <form onSubmit={handleCreateEntry} className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={useRecipeMode} onChange={(e) => setUseRecipeMode(e.target.checked)} />
            {t('production.use_recipe_mode')}
          </label>

          {useRecipeMode ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">{t('production.recipes.select')}</label>
                <select
                  value={newEntry.recipeId}
                  onChange={(e) => {
                    const r = recipes.find((x) => x.id === Number(e.target.value));
                    setNewEntry((p) => ({
                      ...p,
                      recipeId: e.target.value,
                      unit: r?.outputUnit || 'unité',
                      productType: r?.productType || p.productType,
                    }));
                    setPreview(null);
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  required
                >
                  <option value="">{t('production.recipes.select')}</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({formatQuantityWithUnit(r.expectedOutput, r.outputUnit)})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={t('production.qty_produced')} type="number" min="0" required value={newEntry.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setNewEntry((p) => ({ ...p, quantity: e.target.value })); setPreview(null); }} />
                <Input label={t('production.loss_qty')} type="number" min="0" value={newEntry.lossQty}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry((p) => ({ ...p, lossQty: e.target.value }))} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={runPreview} disabled={!newEntry.recipeId || !newEntry.quantity}>
                {t('production.preview_consumption')}
              </Button>
              {preview?.lines && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  {preview.lines.map((row: any, i: number) => (
                    <p key={i} className={cn(!row.sufficient && 'text-red-600 font-bold')}>
                      {row.material?.name}: {formatQuantity(row.quantityActual)} ({t('common.available_stock')} {formatQuantity(row.availableStock)})
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{t('production.product_type')}</label>
                  <select value={newEntry.productType} onChange={e => setNewEntry(p => ({ ...p, productType: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                    {PRODUCT_TYPES.map(pt => <option key={pt}>{pt}</option>)}
                  </select>
                </div>
                <Input label="Désignation" value={newEntry.productLabel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(p => ({ ...p, productLabel: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Quantité" type="number" min="0" required value={newEntry.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(p => ({ ...p, quantity: e.target.value }))} />
                <Input label="Coût unitaire (FCFA)" type="number" min="0" value={newEntry.unitCost}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(p => ({ ...p, unitCost: e.target.value }))} />
              </div>
            </>
          )}

          <Input label="Date" type="date" min={today} required value={newEntry.productionDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(p => ({ ...p, productionDate: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsEntryModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" className="font-bold shadow-lg shadow-blue-900/20" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Traitement...
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Vente */}
      <Modal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} title={t('production.new_sale')} size="md">
        <form onSubmit={handleCreateSale} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('production.sale_recipe_label')}</label>
            {recipes.length === 0 ? (
              <p className="text-sm text-amber-700 font-medium">{t('production.sale_no_recipes')}</p>
            ) : (
              <select
                value={newSale.recipeId}
                onChange={(e) => handleSaleRecipeChange(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium"
              >
                <option value="">{t('production.sale_select_recipe')}</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* Indicateur de stock disponible */}
          {(() => {
            const stockItem = findSummaryByRecipe(newSale.recipeId);
            const dispo = stockItem ? Math.max(0, stockItem.stock) : 0;
            const qty = Number(newSale.quantity) || 0;
            const overStock = qty > dispo;
            const unitLabel = selectedSaleRecipe?.outputUnit || newSale.unit || 'unité';
            return (
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${overStock ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.available_stock')}</p>
                  <p className={`text-xl font-black ${overStock ? 'text-red-600' : 'text-emerald-700'}`}>
                    {formatNumber(dispo)} <span className="text-sm font-medium">{unitLabel}</span>
                  </p>
                </div>
                <div className="text-right">
                  {overStock && (
                    <p className="text-xs font-bold text-red-600">{t('production.insufficient_stock')}</p>
                  )}
                  {qty > 0 && !overStock && (
                    <p className="text-xs font-bold text-emerald-600"> Quantité disponible</p>
                  )}
                  {dispo === 0 && (
                    <p className="text-xs font-bold text-slate-400">Aucun stock</p>
                  )}
                </div>
              </div>
            );
          })()}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Quantité" type="number" min="0" required value={newSale.quantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSale(p => ({ ...p, quantity: e.target.value }))} />
            <Input
              label="Unité"
              value={newSale.unit}
              readOnly
              disabled
            />
            <Input label="Prix unit. (FCFA)" type="number" min="0" required value={newSale.unitPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSale(p => ({ ...p, unitPrice: e.target.value }))} />
          </div>
          {newSale.quantity && newSale.unitPrice && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm font-bold text-emerald-700">Total : {formatCFA(Number(newSale.quantity) * Number(newSale.unitPrice))}</p>
            </div>
          )}
          <Input label="Client" value={newSale.client} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSale(p => ({ ...p, client: e.target.value }))} />
          <Input label="Date de vente" type="date" min={today} required value={newSale.saleDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSale(p => ({ ...p, saleDate: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsSaleModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="secondary" className="font-bold shadow-lg shadow-slate-900/20"
              disabled={isSubmitting || !newSale.recipeId || (() => {
                const si = findSummaryByRecipe(newSale.recipeId);
                const dispo = si ? Math.max(0, si.stock) : 0;
                return Number(newSale.quantity) > dispo;
              })()}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Traitement...
                </>
              ) : (
                'Enregistrer la vente'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
