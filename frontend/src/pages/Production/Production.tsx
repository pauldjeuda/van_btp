import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Factory, ShoppingCart, BarChart3, Plus, Trash2,
  RefreshCw, Filter, Coins, Layers
} from 'lucide-react';
import { Card, Button, Input, Modal, cn } from '../../components/ui';

import { productionService } from '../../services/production.service';
import { useNotification } from '../../context/NotificationContext';
import { PRODUCT_TYPES, PRODUCT_ICONS, PRODUCT_COLORS, UNITS } from './ProductionComponents';


export const ProductionPage = () => {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'fabrication' | 'ventes' | 'comptabilite'>('fabrication');
  const [dashboard, setDashboard] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('Tous');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEntry, setNewEntry] = useState({
    productType: 'Parpaing', productLabel: '', quantity: '', unit: 'unité',
    unitCost: '', productionDate: new Date().toISOString().split('T')[0], note: ''
  });
  const [newSale, setNewSale] = useState({
    productType: 'Parpaing', productLabel: '', quantity: '', unit: 'unité',
    unitPrice: '', saleDate: new Date().toISOString().split('T')[0], client: '', reference: '', note: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const f = { productType: filterType !== 'Tous' ? filterType : undefined, from: filterFrom || undefined, to: filterTo || undefined };
      const [dash, ents, sls] = await Promise.all([
        productionService.getDashboard(),
        productionService.getEntries(f),
        productionService.getSales(f),
      ]);
      setDashboard(dash); setEntries(ents); setSales(sls);
    } catch { notify('Erreur de chargement', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [filterType, filterFrom, filterTo]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(newEntry.quantity) <= 0) { notify('Quantité invalide', 'error'); return; }
    setIsSubmitting(true);
    try {
      await productionService.createEntry({ ...newEntry, quantity: Number(newEntry.quantity), unitCost: Number(newEntry.unitCost || 0) });
      notify('Production enregistrée', 'success');
      setIsEntryModalOpen(false);
      setNewEntry({ productType: 'Parpaing', productLabel: '', quantity: '', unit: 'unité', unitCost: '', productionDate: new Date().toISOString().split('T')[0], note: '' });
      loadData();
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSale.quantity || !newSale.unitPrice) { notify('Quantité et prix requis', 'error'); return; }
    const qty = Number(newSale.quantity);
    if (qty <= 0) { notify('La quantité doit être supérieure à 0', 'error'); return; }

    // Vérifier le stock disponible (calcul local depuis les données chargées)
    const stockItem = dashboard?.summary?.find((s: any) => s.type === newSale.productType);
    const stockDispo = stockItem ? stockItem.stock : 0;
    if (qty > stockDispo) {
      notify(
        `t('production.insufficient_stock') pour "${newSale.productType}" : ${stockDispo} unité(s) disponible(s), vous en demandez ${qty}.`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await productionService.createSale({ ...newSale, quantity: qty, unitPrice: Number(newSale.unitPrice) });
      notify('Vente enregistrée', 'success');
      setIsSaleModalOpen(false);
      setNewSale({ productType: 'Parpaing', productLabel: '', quantity: '', unit: 'unité', unitPrice: '', saleDate: new Date().toISOString().split('T')[0], client: '', reference: '', note: '' });
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
          <Button variant="secondary" onClick={() => setIsSaleModalOpen(true)} className="font-bold h-11 gap-2">
            <ShoppingCart className="w-4 h-4" /> {t('production.new_sale')}
          </Button>
        </div>
      </div>

      {/* KPIs - Corporate Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Chiffre d\'Affaires', value: `${totalRevenue.toLocaleString()}`, unit: 'FCFA', icon: Coins, trend: 'Ventes totales encaissées', color: 'blue' },
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
              return (
                <Card key={item.type} className="p-0 border-none shadow-xl shadow-slate-200/40 overflow-hidden group">
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
                          <h3 className="font-black text-slate-900 text-lg leading-tight">{item.type}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit: {item.unit || 'unité'}</p>
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
                            {Number(stat.val).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valeur Stock (Coût)</p>
                        <p className="text-sm font-black text-amber-700">{(item.stock * (item.avgUnitCost || item.lastUnitCost || 0)).toLocaleString()} <span className="text-[9px] text-slate-400">FCFA</span></p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">CA Réalisé (Vente)</p>
                        <p className="text-sm font-black text-emerald-700">{item.revenue.toLocaleString()} <span className="text-[9px] opacity-60">FCFA</span></p>
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
                <tr>{['Date', 'Article', 'Type', 'Quantité', 'Coût unit.', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {entries.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">{t('production.no_production')}</td></tr>}
                {entries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm">{e.productionDate}</td>
                    <td className="px-6 py-4 text-sm font-bold">{e.productLabel || e.productType}</td>
                    <td className="px-6 py-4"><span className={`text-xs font-bold px-2 py-1 rounded-full border ${PRODUCT_COLORS[e.productType] || PRODUCT_COLORS['Autre']}`}>{PRODUCT_ICONS[e.productType]} {e.productType}</span></td>
                    <td className="px-6 py-4 text-sm font-black">{Number(e.quantity).toLocaleString()} {e.unit}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{Number(e.unitCost || 0).toLocaleString()} FCFA</td>
                    <td className="px-6 py-4"><button onClick={() => productionService.deleteEntry(e.id).then(loadData)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button></td>
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
                      <td className="px-6 py-4 text-sm font-black">{Number(s.quantity).toLocaleString()} {s.unit}</td>
                      <td className="px-6 py-4 text-sm">{Number(s.unitPrice).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-black text-emerald-700">{total.toLocaleString()} FCFA</td>
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
                  <tr key={item.type} className="hover:bg-slate-50">
                    <td className="px-6 py-4"><span className="font-black">{item.type}</span></td>
                    <td className="px-6 py-4 font-bold">{item.produced.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-blue-600">{item.sold.toLocaleString()}</td>
                    <td className="px-6 py-4"><span className={`font-black text-lg ${item.stock < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{item.stock.toLocaleString()}</span></td>
                    <td className="px-6 py-4 text-slate-600">{item.avgUnitCost ? Math.round(item.avgUnitCost).toLocaleString() : '0'} FCFA</td>
                    <td className="px-6 py-4 font-black text-emerald-700">{item.revenue.toLocaleString()} FCFA</td>
                    <td className="px-6 py-4 font-bold text-amber-700">{(item.stock * (item.avgUnitCost || item.lastUnitCost || 0)).toLocaleString()} FCFA</td>
                  </tr>
                ))}
              </tbody>
              {(dashboard?.summary?.length > 0) && (
                <tfoot className="bg-slate-900 text-white">
                  <tr>
                    <td className="px-6 py-4 font-black" colSpan={5}>TOTAL</td>
                    <td className="px-6 py-4 font-black text-emerald-400">{totalRevenue.toLocaleString()} FCFA</td>
                    <td className="px-6 py-4 font-black text-amber-400">{(dashboard.summary.reduce((s: number, i: any) => s + Math.max(0, i.stock) * (i.avgUnitCost || i.lastUnitCost || 0), 0)).toLocaleString()} FCFA</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* Modal Production */}
      <Modal isOpen={isEntryModalOpen} onClose={() => setIsEntryModalOpen(false)} title="Enregistrer une production" size="md">
        <form onSubmit={handleCreateEntry} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">{t('production.product_type')}</label>
              <select value={newEntry.productType} onChange={e => setNewEntry(p => ({ ...p, productType: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                {PRODUCT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Désignation (ex: Parpaing 15x20)" value={newEntry.productLabel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(p => ({ ...p, productLabel: e.target.value }))} placeholder="Optionnel" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Quantité" type="number" min="0" required value={newEntry.quantity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(p => ({ ...p, quantity: e.target.value }))} />
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Unité</label>
              <select value={newEntry.unit} onChange={e => setNewEntry(p => ({ ...p, unit: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <Input label="Prix unitaire de production (FCFA)" type="number" min="0" value={newEntry.unitCost}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry(p => ({ ...p, unitCost: e.target.value }))} />
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">{t('production.product_type')}</label>
              <select value={newSale.productType} onChange={e => setNewSale(p => ({ ...p, productType: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                {PRODUCT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Désignation" value={newSale.productLabel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSale(p => ({ ...p, productLabel: e.target.value }))} />
          </div>
          {/* Indicateur de stock disponible */}
          {(() => {
            const stockItem = dashboard?.summary?.find((s: any) => s.type === newSale.productType);
            const dispo = stockItem ? Math.max(0, stockItem.stock) : 0;
            const qty = Number(newSale.quantity) || 0;
            const overStock = qty > dispo;
            return (
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${overStock ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('common.available_stock')}</p>
                  <p className={`text-xl font-black ${overStock ? 'text-red-600' : 'text-emerald-700'}`}>
                    {dispo.toLocaleString()} <span className="text-sm font-medium">unités</span>
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
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Unité</label>
              <select value={newSale.unit} onChange={e => setNewSale(p => ({ ...p, unit: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <Input label="Prix unit. (FCFA)" type="number" min="0" required value={newSale.unitPrice}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSale(p => ({ ...p, unitPrice: e.target.value }))} />
          </div>
          {newSale.quantity && newSale.unitPrice && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm font-bold text-emerald-700">Total : {(Number(newSale.quantity) * Number(newSale.unitPrice)).toLocaleString()} FCFA</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Client" value={newSale.client} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSale(p => ({ ...p, client: e.target.value }))} />
            <Input label="Référence" value={newSale.reference} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSale(p => ({ ...p, reference: e.target.value }))} />
          </div>
          <Input label="Date de vente" type="date" min={today} required value={newSale.saleDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSale(p => ({ ...p, saleDate: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsSaleModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" variant="secondary" className="font-bold shadow-lg shadow-slate-900/20"
              disabled={isSubmitting || (() => {
                const si = dashboard?.summary?.find((s: any) => s.type === newSale.productType);
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
