import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import {
  TrendingUp, TrendingDown, Receipt, Banknote,
  ArrowUpRight, Search, Building2, AlertTriangle,
  Wallet, RefreshCw, BarChart3, FileText
} from 'lucide-react';

import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useHistory } from '../../context/HistoryContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { debtService } from '../../services/debt.service';
import { financialAnalysisService } from '../../services/financialAnalysis.service';
import { Navigate } from 'react-router-dom';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { fmt, StatusBadge, MarginBar, AlertBadge } from './FinancesComponents';


export const FinancesPage = () => {
    const { t } = useTranslation();
const { can } = usePermissions();
  const { role, profile } = useUser();
  const name = profile?.name;
  const { addLog } = useHistory();
  const { projects, transactions, addTransaction } = useData();
  const { notify } = useNotification();
  const today = new Date().toISOString().split('T')[0];

  // ── Onglets ──
  const [mainTab, setMainTab] = useState<'flux' | 'rentabilite'>('flux');
  const [txTab, setTxTab] = useState<'all' | 'expenses' | 'invoices'>('all');

  // ── Filtres ──
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(15);

  // ── Modales ──
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseStep, setExpenseStep] = useState(1);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isFinanceErrorModalOpen, setIsFinanceErrorModalOpen] = useState(false);
  const [financeErrorMessage, setFinanceErrorMessage] = useState('');

  // États de chargement pour éviter les soumissions multiples
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // ── Dettes ──
  const [debts, setDebts] = useState<any[]>([]);
  const [isLoadingDebts, setIsLoadingDebts] = useState(false);
  const [isDebtsExpanded, setIsDebtsExpanded] = useState(false);
  const [isDebtHistoryOpen, setIsDebtHistoryOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<any>(null);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [isSubmittingRepayment, setIsSubmittingRepayment] = useState(false);
  const [newRepayment, setNewRepayment] = useState({
    amount: '', repaymentDate: today, paymentMethod: 'Virement', note: '',
  });

  // ── KPIs Rentabilité ──
  const [analysis, setAnalysis] = useState<any>(null);
  const [kpiData, setKpiData] = useState<any>(null);
  const [loadingKpi, setLoadingKpi] = useState(false);

  // ── Forms ──
  const CATEGORY_PROVIDERS: Record<string, string> = {
    'Ciment': 'CIMENCAM', 'Acier / Fer à béton': 'QUIFEUROU',
    'Carburant': 'VAN PETROLEUM', 'Sable': 'Carrière Sanaga', 'Gravier': 'Razel Carrière',
    "Main-d'œuvre": 'Personnel Local', 'Sous-traitance': 'PME Partenaire',
  };
  const [newExpense, setNewExpense] = useState({
    projectId: 0, category: 'Ciment', provider: 'CIMENCAM',
    amount: '', date: today, isClientDebt: false,
  });
  const [newInvoice, setNewInvoice] = useState({
    projectId: 0, period: '', amount: '', progress: '',
    client: '', categorieFacture: 'Situation Travaux' as string, dueDate: '', description: '',
  });
  const [newPayment, setNewPayment] = useState({
    projectId: 0, client: '', amount: '',
    date: today, method: 'Virement Bancaire',
  });

  // Sync le projectId par défaut dès que la liste est chargée
  React.useEffect(() => {
    if (projects.length > 0) {
      const firstId = projects[0].id;
      setNewExpense(p => p.projectId === 0 ? { ...p, projectId: firstId } : p);
      setNewInvoice(p => p.projectId === 0 ? { ...p, projectId: firstId } : p);
      setNewPayment(p => p.projectId === 0 ? { ...p, projectId: firstId } : p);
    }
  }, [projects]);

  const getProjectNameById = (id?: number) => projects.find((p: any) => p.id === id)?.name || 'Chantier inconnu';

  // ── Calculs ──
  const filteredTx = transactions.filter((t: any) => selectedProjectFilter === null || t.projectId === selectedProjectFilter);
  const encaisse = Math.abs(filteredTx.filter((t: any) => t.type === 'invoice' && t.status === 'Payé').reduce((s: number, t: any) => s + (t.amount || 0), 0));
  const depenses = Math.abs(filteredTx.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + (t.amount || 0), 0));
  const tresorerie = encaisse - depenses;
  const impayeesTotal = Math.abs(filteredTx.filter((t: any) => t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté').reduce((s: number, t: any) => s + (t.amount || 0), 0));
  const overdueCount = transactions.filter((t: any) => t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté' && t.dueDate && t.dueDate < today).length;

  const displayedTx = transactions.filter((t: any) => {
    const matchTab = txTab === 'all' || (txTab === 'expenses' && t.type === 'expense') || (txTab === 'invoices' && t.type === 'invoice');
    const matchProj = selectedProjectFilter === null || t.projectId === selectedProjectFilter;
    const q = searchQuery.toLowerCase();
    const matchQ = !q || getProjectNameById(t.projectId).toLowerCase().includes(q)
      || (t.provider || t.client || '').toLowerCase().includes(q)
      || (t.category || '').toLowerCase().includes(q);
    return matchTab && matchProj && matchQ;
  }).sort((a: any, b: any) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.id - a.id;
  });

  // ── Loaders ──
  const loadDebts = async () => {
    setIsLoadingDebts(true);
    try { setDebts(await debtService.getAll()); } catch { setDebts([]); }
    finally { setIsLoadingDebts(false); }
  };
  React.useEffect(() => { loadDebts(); }, []);

  const loadKpis = async () => {
    setLoadingKpi(true);
    try { setKpiData(await financialAnalysisService.getAllKPIs()); } catch { /* */ }
    finally { setLoadingKpi(false); }
  };
  React.useEffect(() => { if (mainTab === 'rentabilite' && !kpiData) loadKpis(); }, [mainTab]);

  // Variables dérivées pour les dettes (calculées avant le return)
  const activeDebts = debts.filter((d: any) => d.debtStatus !== 'Remboursé');
  const repaidCount = debts.length - activeDebts.length;

  // ── Handlers ──
  const handleSendReminder = async (transactionId: number) => {
    try {
      const res = await financialAnalysisService.sendReminder(transactionId);
      notify(`Relance N°${res.reminderCount} enregistrée`, 'success');
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
  };

  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !newRepayment.amount) return;
    const montant = Number(newRepayment.amount);
    const reste = Number(selectedDebt.amount) - Number(selectedDebt.debtAmountPaid || 0);
    if (montant > reste + 0.01) { notify(`Montant dépasse le reste dû (${fmt(reste)} FCFA)`, 'error'); return; }
    if (montant <= 0) { notify('Montant invalide', 'error'); return; }
    setIsSubmittingRepayment(true);
    try {
      // 1. Enregistrer le remboursement de dette
      await debtService.addRepayment(selectedDebt.id, { ...newRepayment, amount: montant });

      // 2. Comptabiliser le remboursement comme un encaissement dans le flux financier
      await addTransaction({
        transactionDate: newRepayment.repaymentDate,
        date: newRepayment.repaymentDate,
        projectId: selectedDebt.projectId,
        category: 'Encaissement',
        client: selectedDebt.category || 'Remboursement client',
        amount: montant,
        status: 'Payé',
        type: 'invoice',
        paymentMethod: newRepayment.paymentMethod,
        description: `Remboursement avance : ${selectedDebt.category}${newRepayment.reference ? ' (' + newRepayment.reference + ')' : ''}`,
      });

      notify(`Remboursement de ${fmt(montant)} FCFA enregistré et comptabilisé`, 'success');
      setIsRepaymentModalOpen(false);
      setNewRepayment({ amount: '', repaymentDate: today, paymentMethod: 'Virement', note: '' });
      loadDebts(); // auto-refresh
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
    finally { setIsSubmittingRepayment(false); }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingExpense) return;
    setIsSubmittingExpense(true);

    if (expenseStep < 2) {
      setIsSubmittingExpense(false);
      setExpenseStep(2);
      return;
    }

    // Résoudre le projectId : utiliser la valeur du form ou fallback au premier projet
    const resolvedProjectId = newExpense.projectId || projects[0]?.id || 0;
    const amount = parseFloat(newExpense.amount) || 0;

    if (!resolvedProjectId) {
      notify('Veuillez sélectionner un chantier', 'error');
      setIsSubmittingExpense(false);
      return;
    }
    if (!amount || amount <= 0) {
      notify('Veuillez saisir un montant valide', 'error');
      setIsSubmittingExpense(false);
      return;
    }
    if (!newExpense.date) {
      notify('Veuillez saisir une date', 'error');
      setIsSubmittingExpense(false);
      return;
    }

    // Vérification du solde — SAUF si la dépense est une avance pour le client (dette)
    if (!newExpense.isClientDebt) {
      const projectTxs = transactions.filter((t: any) => t.projectId === resolvedProjectId);
      const totalEncaisse = projectTxs
        .filter((t: any) => t.type === 'invoice' && (t.category === 'Encaissement' || t.status === 'Payé'))
        .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
      const totalDepense = projectTxs
        .filter((t: any) => t.type === 'expense' && !t.isClientDebt)
        .reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
      const solde = totalEncaisse - totalDepense;

      if (totalEncaisse === 0) {
        setFinanceErrorMessage(`Aucun encaissement pour ce chantier. Cochez "${t('finances.client_advance')}" si cette dépense doit être une avance remboursable.`);
        setIsFinanceErrorModalOpen(true);
        setIsExpenseModalOpen(false);
        setExpenseStep(1);
        setIsSubmittingExpense(false);
        return;
      }
      if (amount > solde) {
        setFinanceErrorMessage(`Fonds insuffisants. Solde disponible : ${fmt(solde)} FCFA, montant demandé : ${fmt(amount)} FCFA.`);
        setIsFinanceErrorModalOpen(true);
        setIsSubmittingExpense(false);
        return;
      }
    }

    try {
      await addTransaction({
        transactionDate: newExpense.date,
        date: newExpense.date,
        projectId: resolvedProjectId,
        category: newExpense.category,
        provider: newExpense.provider,
        amount,
        status: 'Validé',
        type: 'expense',
        paymentMethod: 'Virement',
        isClientDebt: newExpense.isClientDebt,
      });
      addLog({ module: 'Finances', action: `Dépense ${newExpense.category} - ${fmt(amount)} FCFA${newExpense.isClientDebt ? ' (Avance client)' : ''}`, user: name || 'Utilisateur', type: 'warning' });
      notify(`Dépense de ${fmt(amount)} FCFA enregistrée${newExpense.isClientDebt ? ' comme avance client' : ''}`, 'success');
      setIsExpenseModalOpen(false);
      setExpenseStep(1);
      setNewExpense({ projectId: resolvedProjectId, category: 'Ciment', provider: 'CIMENCAM', amount: '', date: today, isClientDebt: false });
      if (newExpense.isClientDebt) loadDebts(); // auto-refresh des dettes si avance client
    } catch (err: any) {
      notify(err?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingInvoice) return;
    setIsSubmittingInvoice(true);

    const resolvedProjectId = newInvoice.projectId || projects[0]?.id || 0;
    const amount = parseFloat(newInvoice.amount) || 0;

    if (!resolvedProjectId) {
      notify('Veuillez sélectionner un chantier', 'error');
      setIsSubmittingInvoice(false);
      return;
    }
    if (!amount || amount <= 0) {
      notify('Veuillez saisir un montant valide', 'error');
      setIsSubmittingInvoice(false);
      return;
    }
    if (!newInvoice.client.trim()) {
      notify('Veuillez saisir le nom du client', 'error');
      setIsSubmittingInvoice(false);
      return;
    }

    try {
      await addTransaction({
        transactionDate: today,
        date: today,
        projectId: resolvedProjectId,
        category: newInvoice.categorieFacture,
        categorieFacture: newInvoice.categorieFacture,
        client: newInvoice.client || projects.find((p: any) => p.id === resolvedProjectId)?.client || 'Client',
        amount,
        status: 'En attente',
        type: 'invoice',
        paymentMethod: 'Virement',
        dueDate: newInvoice.dueDate || undefined,
        description: newInvoice.description || undefined,
      });
      addLog({ module: 'Finances', action: `Facture ${newInvoice.categorieFacture} - ${fmt(amount)} FCFA`, user: name || 'Utilisateur', type: 'info' });
      notify(`Facture de ${fmt(amount)} FCFA émise`, 'success');
      setIsInvoiceModalOpen(false);
      setNewInvoice({ projectId: resolvedProjectId, period: '', amount: '', progress: '', client: '', categorieFacture: 'Situation Travaux', dueDate: '', description: '' });
    } catch (err: any) {
      notify(err?.message || 'Erreur lors de l\'émission', 'error');
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPayment) return;
    setIsSubmittingPayment(true);

    // Résoudre le projectId : valeur saisie OU premier projet disponible
    const resolvedProjectId = newPayment.projectId || projects[0]?.id || 0;
    const amount = parseFloat(newPayment.amount) || 0;

    // Validations individuelles avec messages précis
    if (!resolvedProjectId) {
      notify('Veuillez sélectionner un chantier', 'error');
      setIsSubmittingPayment(false);
      return;
    }
    if (!amount || amount <= 0) {
      notify('Veuillez saisir un montant valide (> 0)', 'error');
      setIsSubmittingPayment(false);
      return;
    }
    if (!newPayment.date) {
      notify('Veuillez saisir une date de paiement', 'error');
      setIsSubmittingPayment(false);
      return;
    }

    try {
      await addTransaction({
        transactionDate: newPayment.date,
        date: newPayment.date,
        projectId: resolvedProjectId,
        category: 'Encaissement',
        client: newPayment.client || 'Client',
        amount,
        status: 'Payé',
        type: 'invoice',
        paymentMethod: newPayment.method,
      });
      addLog({ module: 'Finances', action: `Encaissement - ${fmt(amount)} FCFA`, user: name || 'Utilisateur', type: 'success' });
      notify(`Encaissement de ${fmt(amount)} FCFA enregistré`, 'success');
      setIsPaymentModalOpen(false);
      setNewPayment({ projectId: resolvedProjectId, client: '', amount: '', date: today, method: 'Virement Bancaire' });
    } catch (err: any) {
      notify(err?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (!can('consult_budget')) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 pb-12">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-1 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Finances
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{t('finances.management')}</h1>
          <p className="text-sm text-slate-400 mt-0.5">{t('finances.header_desc')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedProjectFilter ?? ''}
            onChange={e => setSelectedProjectFilter(e.target.value ? Number(e.target.value) : null)}
            className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
            <option value="">Tous les chantiers</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {(role === 'Chef_chantier' || role === 'Directeur_technique') && (<>
            <Button size="sm" variant="outline" onClick={() => setIsExpenseModalOpen(true)} className="gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Dépense
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsPaymentModalOpen(true)} className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <ArrowUpRight className="w-3.5 h-3.5" /> Encaissement
            </Button>
            <Button size="sm" onClick={() => setIsInvoiceModalOpen(true)} className="gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> {t('finances.new_invoice')}
            </Button>
          </>)}
        </div>
      </div>

      {/* KPI CARDS — vraies données, sans faux pourcentages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: t('finances.stats.total_collected'), value: encaisse, Icon: TrendingUp, colorCls: 'text-emerald-600', bgCls: 'bg-emerald-50', trend: 'Paiements clients reçus' },
          { label: t('finances.stats.expenses_engaged'), value: depenses, Icon: TrendingDown, colorCls: 'text-red-600', bgCls: 'bg-red-50', trend: 'Charges validées' },
          {
            label: t('finances.stats.net_treasury'), value: tresorerie, Icon: Banknote,
            colorCls: tresorerie >= 0 ? 'text-blue-600' : 'text-red-600',
            bgCls: tresorerie >= 0 ? 'bg-blue-50' : 'bg-red-50',
            trend: tresorerie >= 0 ? 'Situation excédentaire' : 'Situation déficitaire'
          },
        ].map(({ label, value, Icon, colorCls, bgCls, trend }) => (
          <Card key={label} className="p-6 border-none shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-5">
                <div className={cn("p-3 rounded-2xl transition-colors duration-300 group-hover:bg-[var(--color-primary)] group-hover:text-white", bgCls)}>
                  <Icon className={cn("w-6 h-6", colorCls)} />
                </div>
              </div>
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{label}</h4>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-black text-slate-900 tracking-tighter">{fmt(value)}</p>
                <span className="text-[10px] font-bold text-slate-400 uppercase">FCFA</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 mt-2">{trend}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ALERTE IMPAYÉS — vraies données */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">{overdueCount} facture{overdueCount > 1 ? 's' : ''} en retard</p>
            <p className="text-xs text-red-500">Cliquez sur le bouton "Relancer" pour enregistrer une relance</p>
          </div>
          <p className="text-sm font-bold text-red-700 shrink-0 whitespace-nowrap">{fmt(impayeesTotal)} FCFA</p>
        </div>
      )}

      {/* ONGLETS PRINCIPAUX */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {([
          { key: 'flux', label: 'Flux de trésorerie' },
          { key: 'rentabilite', label: 'Rentabilité' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setMainTab(tab.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
              mainTab === tab.key ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ ONGLET FLUX ═══════════════════ */}
      {mainTab === 'flux' && (
        <div className="space-y-5">
          <Card>
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {([
                  { k: 'all', label: 'Tout' },
                  { k: 'expenses', label: 'Dépenses' },
                  { k: 'invoices', label: 'Factures' },
                ] as const).map(t => (
                  <button key={t.k} onClick={() => setTxTab(t.k)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      txTab === t.k ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500')}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Rechercher…" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full sm:w-56" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Date', 'Chantier', 'Désignation', 'Montant', 'Statut', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedTx.slice(0, visibleCount).length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">{t('finances.no_transaction')}</td></tr>
                  ) : displayedTx.slice(0, visibleCount).map((t: any) => {
                    const isOverdue = t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté' && t.dueDate && t.dueDate < today;
                    return (
                      <tr key={t.id} onClick={() => setSelectedTransaction(t)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{t.date}</p>
                          {isOverdue && <p className="text-[10px] text-red-500 font-bold">● Échu</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700 truncate max-w-[130px]">{getProjectNameById(t.projectId)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{t.category}</p>
                          <p className="text-xs text-slate-400">{t.provider || t.client || ''}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm font-bold ${t.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {t.type === 'expense' ? '−' : '+'}{fmt(Math.abs(t.amount || 0))} FCFA
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {t.type === 'invoice' && (
                              <button title="Télécharger PDF"
                                onClick={() => generateInvoicePDF({
                                  invoiceNumber: t.reference || `FAC-${t.id}`,
                                  date: t.date,
                                  dueDate: t.dueDate,
                                  clientName: t.client || 'Client Divers',
                                  projectName: getProjectNameById(t.projectId),
                                  category: t.category,
                                  description: t.description,
                                  amount: t.amount,
                                  status: t.status
                                })}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-[var(--color-primary)] rounded-lg transition-colors border border-transparent hover:border-slate-200">
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            {t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté' && (
                              <button title={`Relancer${t.reminderCount ? ` (${t.reminderCount}×)` : ''}`}
                                onClick={() => handleSendReminder(t.id)}
                                className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border ${t.reminderCount > 0 ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 border-transparent hover:border-amber-200'}`}>
                                Relancer{t.reminderCount > 0 ? ` (${t.reminderCount})` : ''}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visibleCount < displayedTx.length && (
              <div className="p-4 border-t border-slate-100 text-center">
                <button onClick={() => setVisibleCount(c => c + 15)}
                  className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
                  Charger plus ({displayedTx.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </Card>

          {/* Dettes client — accordéon */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            {/* En-tête accordéon */}
            <button
              type="button"
              onClick={() => { setIsDebtsExpanded(v => !v); if (!isDebtsExpanded && debts.length === 0) loadDebts(); }}
              className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-amber-800">
                Avances pour client
                {activeDebts.length > 0 && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">{activeDebts.length} en cours</span>
                )}
              </span>
              <span className={`text-amber-600 transition-transform duration-200 ${isDebtsExpanded ? 'rotate-180' : ''}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </span>
            </button>

            {/* Contenu de l'accordéon */}
            {isDebtsExpanded && (
              <div className="p-3 space-y-3 bg-white">
                {isLoadingDebts ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                  </div>
                ) : activeDebts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">{t('finances.no_advance')}</p>
                ) : (
                  <div className="grid gap-3">
                    {activeDebts.map((debt: any) => {
                      const remaining = Number(debt.amount) - Number(debt.debtAmountPaid || 0);
                      const pct = Math.min(100, Math.round((Number(debt.debtAmountPaid || 0) / Number(debt.amount)) * 100));
                      return (
                        <div key={debt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{debt.category} — {debt.project?.name || 'Chantier'}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{debt.transactionDate}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <p className="text-sm font-bold text-slate-900">{fmt(Number(debt.amount))} FCFA</p>
                              <StatusBadge status={debt.debtStatus || 'Non remboursé'} />
                            </div>
                          </div>
                          <div className="h-1 bg-slate-200 rounded-full mb-2">
                            <div className="h-1 bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500">Reste dû : <span className="font-bold text-red-600">{fmt(remaining)} FCFA</span> <span className="text-slate-400">({pct}% remboursé)</span></p>
                            <button
                              onClick={() => { setSelectedDebt(debt); setIsRepaymentModalOpen(true); }}
                              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              + Remboursement
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bouton historique */}
                <button
                  type="button"
                  onClick={() => { if (debts.length === 0) loadDebts(); setIsDebtHistoryOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors mt-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Historique{repaidCount > 0 ? ` (${repaidCount} remboursé${repaidCount > 1 ? 's' : ''})` : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════ ONGLET RENTABILITÉ ═══════════════════ */}
      {mainTab === 'rentabilite' && (
        <div className="space-y-4">
          <div>
            <Card>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Rentabilité par chantier</h2>
                <button onClick={loadKpis} disabled={loadingKpi}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingKpi ? 'animate-spin' : ''}`} /> Actualiser
                </button>
              </div>
              {loadingKpi ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin h-7 w-7 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Chantier', 'Budget prévu', 'Encaissé', 'Dépenses', 'A facturer', 'Reste', 'Taux', 'Statut'].map(h => (<th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!kpiData ? (
                        <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                          Cliquez "Actualiser" pour charger
                        </td></tr>
                      ) : [...(kpiData?.kpis || [])].sort((a: any, b: any) => b.id - a.id).map((k: any) => (
                        <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-sm text-slate-900 truncate max-w-[160px]">{k.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{k.code}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(k.budget)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(k.encaisse || 0)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmt(k.depenses)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-bold text-amber-600">
                              {fmt(k.ecartBudget)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-bold text-red-600">
                              {fmt(Math.abs(k.marge || 0))}
                            </span>
                          </td>
                          <td className="px-4 py-3"><MarginBar value={k.tauxMarge} /></td>
                          <td className="px-4 py-3"><AlertBadge alert={k.alert} /></td>
                        </tr>
                      ))}
                    </tbody>
                    {kpiData?.totals && (
                      <tfoot>
                        <tr className="bg-slate-900 text-white">
                          <td className="px-4 py-3 text-sm font-bold">TOTAL</td>
                          <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">{fmt(kpiData.totals.budget || 0)}</td>
                          <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">{fmt(kpiData.totals.encaisse || 0)}</td>
                          <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">{fmt(kpiData.totals.depenses || 0)}</td>
                          <td className="px-4 py-3 text-sm font-bold text-amber-400 whitespace-nowrap">
                            {fmt((kpiData.totals.budget || 0) - (kpiData.totals.depenses || 0))}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-red-400 whitespace-nowrap">
                            {fmt(Math.abs(kpiData.totals.marge || 0))}
                          </td>
                          <td className="px-4 py-3"><MarginBar value={kpiData.totals.tauxMargeGlobal || 0} /></td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}


      {/* ═══════════════════ MODALES ═══════════════════ */}

      {/* Erreur finance */}
      <Modal isOpen={isFinanceErrorModalOpen} onClose={() => setIsFinanceErrorModalOpen(false)} title="Règle financière" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{financeErrorMessage}</p>
          </div>
          <p className="text-xs text-slate-500">Enregistrez d'abord un encaissement pour ce chantier avant d'imputer des dépenses.</p>
          <div className="flex justify-end">
            <Button onClick={() => setIsFinanceErrorModalOpen(false)}>{t('common.understood')}</Button>
          </div>
        </div>
      </Modal>

      {/* Dépense */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setExpenseStep(1); }} title="Enregistrer une dépense" size="md">
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          {expenseStep === 1 ? (<>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Chantier *</label>
              <select value={newExpense.projectId} onChange={e => setNewExpense(p => ({ ...p, projectId: Number(e.target.value) }))}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Catégorie *</label>
                <select value={newExpense.category}
                  onChange={e => setNewExpense(p => ({ ...p, category: e.target.value, provider: CATEGORY_PROVIDERS[e.target.value] || p.provider }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  {['Ciment', 'Acier / Fer à béton', 'Carburant', 'Sable', 'Gravier', "Main-d'œuvre", 'Sous-traitance', 'Location Matériel', 'Frais généraux', 'Autre'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Input label="Fournisseur" value={newExpense.provider}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense(p => ({ ...p, provider: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Montant HT (FCFA) *" type="number" min="0" required value={newExpense.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense(p => ({ ...p, amount: e.target.value }))} />
              <Input label="Date *" type="date" min={today} required value={newExpense.date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense(p => ({ ...p, date: e.target.value }))} />
            </div>
            {newExpense.amount && Number(newExpense.amount) > 0 && (
              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 space-y-1">
                <div className="flex justify-between"><span>HT</span><span className="font-bold">{fmt(Number(newExpense.amount))} FCFA</span></div>
                <div className="flex justify-between"><span>TVA 19,25%</span><span className="font-bold">{fmt(Number(newExpense.amount) * 0.1925)} FCFA</span></div>
                <div className="flex justify-between border-t border-blue-200 pt-1"><span className="font-bold">TTC</span><span className="font-bold">{fmt(Number(newExpense.amount) * 1.1925)} FCFA</span></div>
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-amber-50 rounded-xl border border-amber-200">
              <input type="checkbox" checked={newExpense.isClientDebt}
                onChange={e => setNewExpense(p => ({ ...p, isClientDebt: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-amber-800 font-medium">{t('finances.client_advance')} <span className="text-xs text-amber-600">(sera suivie comme dette client)</span></span>
            </label>
          </>) : (
            <div className="text-center py-6 space-y-2">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7 text-blue-500" />
              </div>
              <p className="font-bold text-slate-900">{newExpense.category} — {newExpense.provider}</p>
              <p className="text-2xl font-bold text-slate-900">{fmt(Number(newExpense.amount))} FCFA</p>
              <p className="text-xs text-slate-400">Chantier : {getProjectNameById(newExpense.projectId)}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => expenseStep > 1 ? setExpenseStep(1) : setIsExpenseModalOpen(false)}>
              {expenseStep === 1 ? 'Annuler' : 'Retour'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingExpense}
              className="font-bold shadow-lg shadow-blue-900/20"
            >
              {isSubmittingExpense && expenseStep === 2 ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Traitement...
                </>
              ) : (
                expenseStep === 1 ? 'Continuer ->' : 'Enregistrer'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Facture */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title={t('finances.new_invoice')} size="md">
        <form onSubmit={handleInvoiceSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Chantier *</label>
            <select value={newInvoice.projectId} onChange={e => setNewInvoice(p => ({ ...p, projectId: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Type de facture *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { value: 'Situation Travaux', label: 'Situation Travaux', desc: 'Avancement en cours' },
                { value: 'Honoraires Études', label: 'Honoraires Études', desc: 'Études et conception' },
                { value: 'Honoraires Réalisation', label: 'Honoraires Réalisation', desc: 'Pilotage travaux' },
                { value: 'Décompte Final', label: 'Décompte Final', desc: 'Clôture du marché' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setNewInvoice(p => ({ ...p, categorieFacture: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${newInvoice.categorieFacture === opt.value ? 'border-[var(--color-primary)] bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <p className="text-xs font-bold text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Client *" required value={newInvoice.client} placeholder="MINTP, MINHDU…"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInvoice(p => ({ ...p, client: e.target.value }))} />
            <Input label="Montant HT (FCFA) *" type="number" min="0" required value={newInvoice.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInvoice(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date d'échéance" type="date" min={today} value={newInvoice.dueDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInvoice(p => ({ ...p, dueDate: e.target.value }))} />
            <Input label={t('finances.table.reference')} value={newInvoice.description} placeholder="N° marché…"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInvoice(p => ({ ...p, description: e.target.value }))} />
          </div>
          {newInvoice.amount && Number(newInvoice.amount) > 0 && (
            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 space-y-1">
              <div className="flex justify-between"><span>HT</span><span className="font-bold">{fmt(Number(newInvoice.amount))} FCFA</span></div>
              <div className="flex justify-between"><span>TVA 19,25%</span><span className="font-bold">{fmt(Number(newInvoice.amount) * 0.1925)} FCFA</span></div>
              <div className="flex justify-between border-t border-blue-200 pt-1"><span className="font-bold">TTC</span><span className="font-bold">{fmt(Number(newInvoice.amount) * 1.1925)} FCFA</span></div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsInvoiceModalOpen(false)}>{t('common.cancel')}</Button>
            <Button
              type="submit"
              disabled={isSubmittingInvoice}
              className="font-bold shadow-lg shadow-blue-900/20"
            >
              {isSubmittingInvoice ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Traitement...
                </>
              ) : (
                'Émettre la Facture'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Encaissement */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Enregistrer un Encaissement" size="sm">
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Chantier *</label>
            <select
              value={newPayment.projectId || ''}
              onChange={e => setNewPayment(p => ({ ...p, projectId: Number(e.target.value) }))}
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              <option value="" disabled>-- Choisir un chantier --</option>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Client" value={newPayment.client}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment(p => ({ ...p, client: e.target.value }))} />
            <Input label="Montant (FCFA) *" type="number" min="0" required value={newPayment.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment(p => ({ ...p, amount: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Date *" type="date" required value={newPayment.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment(p => ({ ...p, date: e.target.value }))} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Mode</label>
              <select value={newPayment.method} onChange={e => setNewPayment(p => ({ ...p, method: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                {['Virement Bancaire', 'Chèque', 'Espèces', 'Mobile Money'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsPaymentModalOpen(false)}>{t('common.cancel')}</Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-900/20"
              disabled={isSubmittingPayment}
            >
              {isSubmittingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Traitement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Détail transaction */}
      <Modal isOpen={!!selectedTransaction} onClose={() => setSelectedTransaction(null)} title="Détail transaction" size="sm">
        {selectedTransaction && (
          <div className="space-y-2">
            {([
              ['Type', selectedTransaction.type === 'expense' ? 'Dépense' : 'Facture'],
              ['Chantier', getProjectNameById(selectedTransaction.projectId)],
              ['Catégorie', selectedTransaction.category || '—'],
              ['Tiers', selectedTransaction.provider || selectedTransaction.client || '—'],
              ['Montant', `${fmt(Math.abs(selectedTransaction.amount || 0))} FCFA`],
              ['Statut', selectedTransaction.status],
              ['Date', selectedTransaction.date],
              ...(selectedTransaction.dueDate ? [['Échéance', selectedTransaction.dueDate]] : []),
              ...(selectedTransaction.reminderCount > 0 ? [['Relances', `${selectedTransaction.reminderCount}×`]] : []),
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="text-sm font-semibold text-slate-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-100">
              {selectedTransaction.type === 'invoice' && (
                <Button variant="outline" className="gap-2 h-9 text-xs" onClick={() => generateInvoicePDF({
                  invoiceNumber: selectedTransaction.reference || `FAC-${selectedTransaction.id}`,
                  date: selectedTransaction.date,
                  dueDate: selectedTransaction.dueDate,
                  clientName: selectedTransaction.client || 'Client Divers',
                  projectName: getProjectNameById(selectedTransaction.projectId),
                  category: selectedTransaction.category,
                  description: selectedTransaction.description,
                  amount: selectedTransaction.amount,
                  status: selectedTransaction.status
                })}>
                  <FileText className="w-3.5 h-3.5" /> Exporter PDF
                </Button>
              )}
              <Button variant="ghost" className="h-9 text-xs" onClick={() => setSelectedTransaction(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Remboursement dette */}
      {isRepaymentModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsRepaymentModalOpen(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Enregistrer un remboursement</h3>
            <div className="p-3 bg-amber-50 rounded-xl mb-4">
              <p className="text-sm text-amber-800"><strong>{selectedDebt.category}</strong> — {fmt(Number(selectedDebt.amount))} FCFA</p>
              <p className="text-sm text-amber-800 mt-0.5">Reste dû : <strong className="text-red-600">{fmt(Number(selectedDebt.amount) - Number(selectedDebt.debtAmountPaid || 0))} FCFA</strong></p>
            </div>
            <form onSubmit={handleRepaymentSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Montant (FCFA) *" type="number" min="0" required value={newRepayment.amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRepayment(p => ({ ...p, amount: e.target.value }))} />
                <Input label="Date *" type="date" required value={newRepayment.repaymentDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRepayment(p => ({ ...p, repaymentDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Mode de paiement</label>
                <select value={newRepayment.paymentMethod} onChange={e => setNewRepayment(p => ({ ...p, paymentMethod: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm bg-white">
                  {['Virement', 'Chèque', 'Espèces', 'Mobile Money'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsRepaymentModalOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmittingRepayment}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-900/20"
                >
                  {isSubmittingRepayment ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Traitement...
                    </>
                  ) : (
                    'Enregistrer'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historique des dettes */}
      {isDebtHistoryOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsDebtHistoryOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Historique des avances client</h3>
                <p className="text-xs text-slate-400 mt-0.5">{debts.length} enregistrement{debts.length > 1 ? 's' : ''} au total</p>
              </div>
              <button onClick={() => setIsDebtHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {debts.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Aucune avance enregistrée</p>
              ) : (
                debts.map((debt: any) => {
                  const paid = Number(debt.debtAmountPaid || 0);
                  const total = Number(debt.amount);
                  const pct = Math.min(100, Math.round((paid / total) * 100));
                  const isFullyRepaid = debt.debtStatus === 'Remboursé';
                  return (
                    <div key={debt.id} className={`p-4 rounded-xl border ${isFullyRepaid ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{debt.category}</p>
                            {isFullyRepaid && (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">✓ Soldé</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{debt.project?.name || 'Chantier'} • {debt.transactionDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{fmt(total)} FCFA</p>
                          <p className="text-xs text-slate-500">Remboursé : {fmt(paid)} FCFA</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full">
                        <div className={`h-1.5 rounded-full transition-all ${isFullyRepaid ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1 text-right">{pct}% remboursé</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
