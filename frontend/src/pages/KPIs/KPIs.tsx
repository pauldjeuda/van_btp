import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, AlertTriangle,
  ArrowUpDown, RefreshCw, BarChart3, Banknote,
  Target, Activity
} from 'lucide-react';
import { Card, Button, cn } from '../../components/ui';
import { financialAnalysisService } from '../../services/financialAnalysis.service';
import { useNotification } from '../../context/NotificationContext';
import { useUser } from '../../context/UserContext';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

const AlertBadge = ({ alert }: { alert: string }) => {
  const cfg = {
    ok:      { label: 'Sain',         cls: 'bg-emerald-100 text-emerald-700' },
    warning: { label: 'Vigilance',    cls: 'bg-amber-100 text-amber-700' },
    danger:  { label: 'Critique',     cls: 'bg-red-100 text-red-700' },
    neutral: { label: 'Sans facture', cls: 'bg-slate-100 text-slate-500' }
}[alert] || { label: alert, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs font-black px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
};

const MarginBar = ({ value }: { value: number }) => {
  const color = value >= 15 ? 'bg-emerald-500' : value >= 5 ? 'bg-amber-500' : 'bg-red-500';
  const pct   = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-black min-w-[36px] text-right ${value >= 15 ? 'text-emerald-600' : value >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
        {value}%
      </span>
    </div>
  );
};

export const KPIsPage = () => {
    const { t } = useTranslation();
const { notify } = useNotification();
  const { role }   = useUser();
  const [data,     setData]     = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [sortKey,  setSortKey]  = useState<string>('name');
  const [sortAsc,  setSortAsc]  = useState(true);
  const [selProject, setSelProject] = useState<any>(null);
  const [analysis,   setAnalysis]   = useState<any>(null);
  const [loadingAna, setLoadingAna] = useState(false);
  const [activeView, setActiveView] = useState<'kpis' | 'accounting'>('kpis');
  const [accounting, setAccounting] = useState<any[]>([]);
  const [loadingAccounting, setLoadingAccounting] = useState(false);
  const [accountingFilters, setAccountingFilters] = useState({ projectId: '', from: '', to: '' });

  const load = async () => {
    setLoading(true);
    try {
      setData(await financialAnalysisService.getAllKPIs());
    } catch { notify('Erreur chargement KPIs', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const loadAccounting = async () => {
    setLoadingAccounting(true);
    try {
      const filters: any = {};
      if (accountingFilters.projectId) filters.projectId = Number(accountingFilters.projectId);
      if (accountingFilters.from) filters.from = accountingFilters.from;
      if (accountingFilters.to) filters.to = accountingFilters.to;
      setAccounting(await financialAnalysisService.getAccounting(filters));
    } catch { notify('Erreur chargement journal', 'error'); }
    finally { setLoadingAccounting(false); }
  };

  React.useEffect(() => {
    if (activeView === 'accounting') loadAccounting();
  }, [activeView]);

  const loadAnalysis = async (project: any) => {
    setSelProject(project);
    setLoadingAna(true);
    try {
      setAnalysis(await financialAnalysisService.getProjectAnalysis(project.id));
    } catch { notify('Erreur analyse', 'error'); }
    finally { setLoadingAna(false); }
  };

  const sort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const rows = (data?.kpis || []).slice().sort((a: any, b: any) => {
    const va = a[sortKey] ?? ''; const vb = b[sortKey] ?? '';
    return sortAsc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
  });

  const totals = data?.totals || {};

  const SortTh = ({ label, k }: { label: string; k: string }) => (
    <th onClick={() => sort(k)} className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest cursor-pointer hover:text-[var(--color-primary)] select-none whitespace-nowrap">
      <span className="flex items-center gap-1">{label} {sortKey === k && <ArrowUpDown className="w-3 h-3" />}</span>
    </th>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <BarChart3 className="w-4 h-4" /><span>{t('dashboard.title')}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">KPIs BTP</h1>
          <p className="text-slate-500 mt-1">Rentabilité, marges et analyse des écarts par chantier</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
            {(['kpis', 'accounting'] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)}
                className={cn('px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                  activeView === v ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700')}>
                {v === 'kpis' ? ' KPIs' : ' Comptabilité'}
              </button>
            ))}
          </div>
          <Button 
            variant="outline" 
            onClick={activeView === 'kpis' ? load : loadAccounting} 
            className="font-bold h-10 gap-2 bg-white shadow-sm"
            disabled={loading || loadingAccounting}
          >
            {loading || loadingAccounting ? (
              <>
                <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                Chargement...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Actualiser
              </>
            )}
          </Button>
        </div>
      </div>

{activeView === 'kpis' && (
        <>
      {/* KPI Cards globaux */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Budget total', value: `${fmt(totals.budget || 0)} FCFA`, icon: Target,      color: 'text-blue-600',    bg: 'bg-blue-50' },
            { label: 'Coûts réels',  value: `${fmt(totals.depenses || 0)} FCFA`, icon: Banknote, color: 'text-red-600',     bg: 'bg-red-50' },
            { label: 'CA facturé',   value: `${fmt(totals.ca || 0)} FCFA`,       icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Marge globale', value: `${totals.tauxMargeGlobal || 0}%`,  icon: Activity,   color: 'text-purple-600',  bg: 'bg-purple-50' },
          ].map((kpi, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${kpi.bg}`}><kpi.icon className={`w-4 h-4 ${kpi.color}`} /></div>
              </div>
              <p className="text-xl font-black text-slate-900">{kpi.value}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tableau KPI */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Rentabilité par chantier</h2>
              <p className="text-xs text-slate-400 mt-1">Cliquez sur une ligne pour l'analyse détaillée</p>
            </div>
            {loading ? (
              <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <SortTh label="Chantier" k="name" />
                      <SortTh label="Budget" k="budget" />
                      <SortTh label="Coût réel" k="depenses" />
                      <SortTh label="Écart" k="ecartBudget" />
                      <SortTh label="Taux marge" k="tauxMarge" />
                      <SortTh label="Rentabilité" k="rentabilite" />
                      <SortTh label="Statut" k="alert" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Aucun projet</td></tr>
                    )}
                    {rows.map((k: any) => (
                      <tr key={k.id} onClick={() => loadAnalysis(k)}
                        className={cn("hover:bg-blue-50 cursor-pointer transition-colors", selProject?.id === k.id && "bg-blue-50 border-l-4 border-[var(--color-primary)]")}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-sm text-slate-900">{k.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{k.code}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-600 whitespace-nowrap">{fmt(k.budget)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-600 whitespace-nowrap">{fmt(k.depenses)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm font-bold ${k.ecartBudget >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {k.ecartBudget >= 0 ? '+' : ''}{fmt(k.ecartBudget)}
                          </span>
                        </td>
                        <td className="px-4 py-3 min-w-[140px]"><MarginBar value={k.tauxMarge} /></td>
                        <td className="px-4 py-3">
                          <span className={cn('text-sm font-bold', (k.rentabilite ?? 0) >= 10 ? 'text-emerald-600' : (k.rentabilite ?? 0) >= 0 ? 'text-amber-600' : 'text-red-600')}>
                            {k.rentabilite ?? '—'}%
                          </span>
                        </td>
                        <td className="px-4 py-3"><AlertBadge alert={k.alert} /></td>
                      </tr>
                    ))}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot className="bg-slate-900 text-white">
                      <tr>
                        <td className="px-4 py-3 font-black text-sm">TOTAL ({rows.length} chantiers)</td>
                        <td className="px-4 py-3 text-sm font-bold">{fmt(totals.budget || 0)}</td>
                        <td className="px-4 py-3 text-sm font-bold">{fmt(totals.depenses || 0)}</td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-400">{fmt((totals.budget||0)-(totals.depenses||0))}</td>
                        <td className="px-4 py-3"><MarginBar value={totals.tauxMargeGlobal || 0} /></td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-400">
                          {totals.budget > 0 ? Math.round(((totals.marge || 0) / totals.budget) * 100) : 0}%
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Panel analyse détaillée */}
        <div>
          <Card className="p-5 sticky top-4">
            {!selProject ? (
              <div className="text-center py-12">
                <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">Sélectionnez un chantier pour<br/>voir l'analyse détaillée</p>
              </div>
            ) : loadingAna ? (
              <div className="flex justify-center py-12"><div className="animate-spin h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>
            ) : analysis ? (
              <div className="space-y-5">
                <div>
                  <h3 className="font-black text-slate-900">{analysis.projectName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Analyse financière complète</p>
                </div>

                {/* Métriques clés */}
                {[
                  { label: 'Budget prévu',    value: `${fmt(analysis.budgetTotal)} FCFA`,       color: 'text-slate-700' },
                  { label: 'Coût réel',        value: `${fmt(analysis.totalDepenses)} FCFA`,     color: 'text-slate-700' },
                  { label: 'Écart budgétaire', value: `${analysis.ecartAbsolu >= 0 ? '+' : ''}${fmt(analysis.ecartAbsolu)} FCFA (${analysis.ecartPct}%)`, color: analysis.ecartAbsolu >= 0 ? 'text-emerald-600' : 'text-red-600' },
                  { label: 'CA facturé',       value: `${fmt(analysis.totalFacture)} FCFA`,      color: 'text-slate-700' },
                  { label: 'Honoraires à facturer', value: `${fmt(analysis.honorairesAFacturer)} FCFA`, color: 'text-amber-600 font-black' },
                  { label: 'Marge réelle',     value: `${fmt(analysis.margeReelle)} FCFA`,       color: analysis.margeReelle >= 0 ? 'text-emerald-600' : 'text-red-600' },
                  { label: 'Taux de marge',    value: `${analysis.tauxMarge}%`,                   color: analysis.tauxMarge >= 15 ? 'text-emerald-600' : analysis.tauxMarge >= 5 ? 'text-amber-600' : 'text-red-600' },
                  { label: 'Taux consommation',value: `${analysis.tauxConsommation}%`,            color: 'text-slate-700' },
                  { label: 'Rentabilité (Marge/Budget)', value: `${analysis.rentabilite ?? 0}%`,  color: (analysis.rentabilite ?? 0) >= 10 ? 'text-emerald-600' : (analysis.rentabilite ?? 0) >= 0 ? 'text-amber-600' : 'text-red-600' },
                  { label: 'Projection terminaison (EAC)', value: `${fmt(analysis.eac)} FCFA`,  color: 'text-purple-600' },
                ].map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-xs font-medium text-slate-500">{m.label}</span>
                    <span className={`text-xs font-black ${m.color}`}>{m.value}</span>
                  </div>
                ))}

                {analysis.impayeesEnRetard > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-700">{analysis.impayeesEnRetard} facture(s) en retard</p>
                  </div>
                )}

                {/* Ventilation par poste */}
                {analysis.budgetItems?.length > 0 && (
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Écarts par poste</p>
                    <div className="space-y-2">
                      {analysis.budgetItems.map((item: any, i: number) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-600">{item.poste}</span>
                            <span className={`font-black ${item.ecart >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {item.ecart >= 0 ? '+' : ''}{fmt(item.ecart)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-1.5 rounded-full ${item.ecart >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                              style={{ width: `${Math.min(100, Math.abs(item.ecartPct))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
        </>
      )}

      {activeView === 'accounting' && (
        <div className="space-y-5">
          {/* Filtres journal */}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chantier</label>
              <select value={accountingFilters.projectId}
                onChange={e => setAccountingFilters(p => ({...p, projectId: e.target.value}))}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-[var(--color-primary)] outline-none">
                <option value="">Tous les chantiers</option>
                {(data?.kpis || []).map((k: any) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Du</label>
              <input type="date" value={accountingFilters.from}
                onChange={e => setAccountingFilters(p => ({...p, from: e.target.value}))}
                className="h-10 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Au</label>
              <input type="date" value={accountingFilters.to}
                onChange={e => setAccountingFilters(p => ({...p, to: e.target.value}))}
                className="h-10 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
            </div>
            <Button 
              onClick={loadAccounting} 
              className="h-10 gap-2 shrink-0 font-bold shadow-lg shadow-blue-900/20"
              disabled={loadingAccounting}
            >
              {loadingAccounting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Filtrage...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Filtrer
                </>
              )}
            </Button>
          </div>

          {/* Journal comptable */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Journal comptable</h2>
                <p className="text-xs text-slate-400 mt-0.5">{accounting.length} écriture{accounting.length > 1 ? 's' : ''} — Plan : 411 Clients · 706 CA · 601 Achats · 401 Fournisseurs</p>
              </div>
            </div>
            {loadingAccounting ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
              </div>
            ) : accounting.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-semibold text-slate-400">Aucune écriture comptable</p>
                <p className="text-xs text-slate-300 mt-1">Les écritures sont générées automatiquement à chaque transaction</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Date', 'Chantier', 'Libellé', 'Compte', 'Débit (FCFA)', 'Crédit (FCFA)', 'Réf.'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounting.map((entry: any, i: number) => (
                      <tr key={entry.id} className={cn('hover:bg-slate-50 transition-colors', i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap font-mono">{entry.journalDate}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 font-medium whitespace-nowrap max-w-[150px] truncate">
                          {entry.project?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 max-w-[200px] truncate" title={entry.label}>{entry.label}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs font-black px-2 py-0.5 rounded-full font-mono', {
                            'bg-blue-100 text-blue-700': entry.account === '411',
                            'bg-emerald-100 text-emerald-700': entry.account === '706',
                            'bg-amber-100 text-amber-700': entry.account === '601',
                            'bg-slate-100 text-slate-600': entry.account === '401'
})}>
                            {entry.account} {entry.accountLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right whitespace-nowrap">
                          {Number(entry.debit) > 0 ? new Intl.NumberFormat('fr-FR').format(Number(entry.debit)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right whitespace-nowrap">
                          {Number(entry.credit) > 0 ? new Intl.NumberFormat('fr-FR').format(Number(entry.credit)) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{entry.reference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totaux */}
                  <tfoot className="bg-slate-900 text-white">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold">TOTAUX</td>
                      <td className="px-4 py-3 text-sm font-bold text-right whitespace-nowrap">
                        {new Intl.NumberFormat('fr-FR').format(accounting.reduce((s: number, e: any) => s + Number(e.debit || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right whitespace-nowrap">
                        {new Intl.NumberFormat('fr-FR').format(accounting.reduce((s: number, e: any) => s + Number(e.credit || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
