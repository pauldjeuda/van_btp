import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  TrendingUp,
  Banknote,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
  ChevronRight,
  Building2,
  HardHat,
  Activity,
  LogIn,
  LogOut
} from 'lucide-react';
import { Card, cn, Button, Modal } from '../../components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import { exportToCSV } from '../../lib/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Navigate, useLocation } from 'react-router-dom';
import { scrollToHashElement } from '../../lib/scrollToHash';

const data: any[] = [];
const pieData: any[] = [];

const COLORS = ['#1a365d', '#e11d48', '#0ea5e9', '#10b981'];

import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { filterProjectsForRole } from '../../lib/projectAccess';
import { dashboardService } from '../../services/dashboard.service';
import { projectTaskService } from '../../services/projectTask.service';
import { StatCard, ProjectRow, AlertItem } from './DashboardComponents';
import { PendingApprovalsPanel } from './PendingApprovalsPanel';
import type { PendingApprovalsResponse } from '../../services/approval.service';
import { ReportPhotos } from '../../components/project/ReportPhotos';
import { getIncidentImagesFromRecord } from '../../lib/incidentImages';

export const Dashboard = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { profile, role } = useUser();
  const dashRole = role === 'Directeur technique' ? 'dg' : 'chef';

  if (role === 'Gestionnaire de stocks') {
    return <Navigate to="/resources" replace />;
  }
  if (role === 'Gerant_production') {
    return <Navigate to="/production" replace />;
  }

  const { projects, transactions, incidents, employees, checklists, refreshIncidents } = useData();
  const visibleProjects = useMemo(
    () => filterProjectsForRole(projects, role, profile?.id),
    [projects, role, profile?.id],
  );
  const { notify, pushPersistent } = useNotification();
  const location = useLocation();
  const [alertsHighlight, setAlertsHighlight] = useState(false);
  const dgIncidentSeenKey = 'van_dg_incident_notified_ids';

  const [selectedRegion, setSelectedRegion] = useState('__all_regions__');
  const [selectedProject, setSelectedProject] = useState<number | null>(null); // null = tous les chantiers

  const [isRegionFilterOpen, setIsRegionFilterOpen] = useState(false);
  const [isProjectFilterOpen, setIsProjectFilterOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isConvoquerModalOpen, setIsConvoquerModalOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isEscaladerModalOpen, setIsEscaladerModalOpen] = useState(false);
  const [isAlertCenterModalOpen, setIsAlertCenterModalOpen] = useState(false);
  const [alertCenterTab, setAlertCenterTab] = useState<'active' | 'history'>('active');

  const [exportStep, setExportStep] = useState(1);

  useEffect(() => {
    if (location.hash === '#business-alerts') {
      scrollToHashElement('#business-alerts');
      setAlertsHighlight(true);
      const timer = window.setTimeout(() => setAlertsHighlight(false), 2500);
      return () => window.clearTimeout(timer);
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (role !== 'Directeur technique') return;
    const open = incidents.filter((i) => i.status !== 'Résolu' && i.status !== 'Fermé');
    const initKey = `${dgIncidentSeenKey}_init`;
    if (!sessionStorage.getItem(initKey)) {
      sessionStorage.setItem(dgIncidentSeenKey, JSON.stringify(open.map((i) => i.id)));
      sessionStorage.setItem(initKey, '1');
      return;
    }
    const seen = new Set<number>(JSON.parse(sessionStorage.getItem(dgIncidentSeenKey) || '[]'));
    open.forEach((inc) => {
      if (seen.has(inc.id)) return;
      const site = visibleProjects.find((p) => p.id === inc.projectId)?.name || t('dashboard.unknown_site');
      pushPersistent(
        t('dashboard.notifications.new_incident', { title: inc.title, site }),
        inc.gravity === 'Critique' ? 'warning' : 'info',
        '/dashboard#business-alerts',
      );
      seen.add(inc.id);
    });
    sessionStorage.setItem(dgIncidentSeenKey, JSON.stringify([...seen]));
  }, [incidents, role, projects, pushPersistent, t]);

  useEffect(() => {
    if (role !== 'Directeur technique') return;
    const interval = window.setInterval(() => refreshIncidents().catch(() => {}), 45000);
    return () => window.clearInterval(interval);
  }, [role, refreshIncidents]);

  useEffect(() => {
    const refreshKpis = async () => {
      if (role !== 'Directeur technique') return;
      try {
        const kpis = await dashboardService.getKPIs();
        setBackendKpis(kpis);
      } catch { /* ignore */ }
    };
    refreshKpis();
    window.addEventListener('van_btp:approvals_updated', refreshKpis);
    return () => window.removeEventListener('van_btp:approvals_updated', refreshKpis);
  }, [role]);

  const [activeDeepDive, setActiveDeepDive] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState('Excel Consolidé (Données Brutes)');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [backendKpis, setBackendKpis] = useState<any | null>(null);

  const handlePendingApprovalsUpdated = useCallback((pending: PendingApprovalsResponse) => {
    setBackendKpis((prev: any) => (prev ? { ...prev, pendingApprovals: pending } : { pendingApprovals: pending }));
  }, []);

  const openIncidentAlertDetail = (incident: (typeof incidents)[0]) => {
    setIsAlertCenterModalOpen(false);
    setSelectedAlert({
      incidentId: incident.id,
      title: `Incident ${incident.gravity}`,
      chantier: visibleProjects.find(p => p.id === incident.projectId)?.name || t('dashboard.unknown_site'),
      type: incident.type,
      description: incident.description || incident.desc,
      date: incident.date,
      statut: incident.status,
      image: incident.image,
      images: incident.images,
    });
  };

  // Filtered Data
  const effectiveProjectFilter = selectedProject;

  const filteredSourceProjects = visibleProjects.filter(p => {
    const matchesRegion = selectedRegion === '__all_regions__' || p.region === selectedRegion;
    const matchesProject = effectiveProjectFilter === null || effectiveProjectFilter === 'None' || p.id === effectiveProjectFilter;
    return matchesRegion && matchesProject;
  });

  const filteredSourceTransactions = transactions.filter(t => {
    const project = visibleProjects.find(p => p.id === t.projectId);
    if (!project) return false; // Ignorer les transactions sans projet valide

    const matchesProject = effectiveProjectFilter === null || effectiveProjectFilter === 'None' || t.projectId === effectiveProjectFilter;
    const matchesRegion = selectedRegion === '__all_regions__' || project.region === selectedRegion;
    return matchesProject && matchesRegion;
  });

  const filteredSourceIncidents = incidents.filter(i => {
    const project = visibleProjects.find(p => p.id === i.projectId);
    if (!project) return false; // Ignorer les incidents sans projet valide

    const matchesProject = effectiveProjectFilter === null || effectiveProjectFilter === 'None' || i.projectId === effectiveProjectFilter;
    const matchesRegion = selectedRegion === '__all_regions__' || project.region === selectedRegion;
    return matchesProject && matchesRegion;
  });

  // Map context projects to dashboard format
  const dashboardProjects = filteredSourceProjects.map(p => {
    const budgetValue = Math.round(Number(p.budget)) || 0;
    return {
      id: p.id,
      code: p.code || `PRJ-${p.id}`,
      name: p.name,
      client: p.client,
      budget: budgetValue,
      ca: budgetValue * (p.progress / 100),
      margin: "20%", // Default margin for new projects
      progress: p.progress,
      status: p.status,
      region: p.region,
      location: p.location || 'N/A',
      manager: p.manager || 'N/A',
      start: p.startDate || p.start || 'N/A',
      end: p.endDate || p.end || 'N/A',
      dateCreation: p.dateCreation || p.startDate || new Date().toISOString().split('T')[0]
    };
  });


  const isGlobalView = (selectedProject === null || selectedProject === 'None') && selectedRegion === '__all_regions__';

  const totalBudget = (isGlobalView && backendKpis?.projects?.budgetTotal)
    ? backendKpis.projects.budgetTotal
    : filteredSourceProjects.reduce((sum, p) => sum + (Math.round(Number(p.budget) || 0)), 0);
  const formattedBudget = new Intl.NumberFormat('fr-FR').format(totalBudget).replace(/\s/g, ' ');

  // Toutes les métriques financières depuis le backend ou local
  const localInvoices = filteredSourceTransactions
    .filter(t => t.type === 'invoice')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const localExpenses = filteredSourceTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const localPaid = filteredSourceTransactions
    .filter(t => t.type === 'invoice' && t.status === 'Payé')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalCA = (isGlobalView && backendKpis?.finances?.totalFactures) ? backendKpis.finances.totalFactures : localInvoices;
  const formattedCA = new Intl.NumberFormat('fr-FR').format(totalCA).replace(/\s/g, ' ');

  const totalExpenses = (isGlobalView && backendKpis?.finances?.totalDepenses) ? backendKpis.finances.totalDepenses : localExpenses;
  const formattedExpenses = new Intl.NumberFormat('fr-FR').format(totalExpenses).replace(/\s/g, ' ');

  const totalEncaisse = (isGlobalView && backendKpis?.finances?.totalFactures)
    ? backendKpis.finances.totalFactures
    : localPaid;
  const formattedEncaisse = new Intl.NumberFormat('fr-FR').format(totalEncaisse).replace(/\s/g, ' ');

  // Marge = Encaissé - Dépenses (meme source pour les deux)
  const totalMargin = totalEncaisse - totalExpenses;
  const formattedMargin = new Intl.NumberFormat('fr-FR').format(totalMargin).replace(/\s/g, ' ');

  const avgProgress = filteredSourceProjects.length > 0
    ? Math.round(filteredSourceProjects.reduce((sum, p) => sum + p.progress, 0) / filteredSourceProjects.length)
    : 0;

  const totalProjects = (isGlobalView && backendKpis?.projects?.total) ? backendKpis.projects.total : filteredSourceProjects.length;
  const criticalIncidents = (isGlobalView && backendKpis?.incidents?.graves) ? backendKpis.incidents.graves : filteredSourceIncidents.filter(i => i.gravity === 'Critique').length;

  // Dynamic chart data
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'AoÃ»t', 'Sep', 'Oct', 'Nov', 'Déc'];
  const allMonths = months;

  const dynamicChartData = allMonths.map((monthName, idx) => {
    const currentYear = new Date().getFullYear();
    // Filter transactions for this specific month
    const monthTransactions = filteredSourceTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === idx && tDate.getFullYear() === currentYear;
    });

    const ca = monthTransactions
      .filter(t => t.type === 'invoice' || t.type === 'Vente') // Support multiple types if exists
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const expenses = Math.abs(monthTransactions
      .filter(t => t.type === 'expense' || t.type === 'Achat')
      .reduce((sum, t) => sum + t.amount, 0));

    // Project date alignment logic
    let isWithinProjectBounds = true;
    if (selectedProject !== null) {
      const proj = visibleProjects.find(p => p.id === selectedProject);
      if (proj && proj.start && proj.end) {
        const start = new Date(proj.start);
        const end = new Date(proj.end);
        const currentMonthFirstDay = new Date(currentYear, idx, 1);
        isWithinProjectBounds = currentMonthFirstDay >= new Date(start.getFullYear(), start.getMonth(), 1) &&
          currentMonthFirstDay <= new Date(end.getFullYear(), end.getMonth(), 1);
      }
    }

    return {
      name: monthName,
      ca,
      expenses,
      margin: ca - expenses,
      isActive: isWithinProjectBounds // Can be used for styling the bars/areas
    };
  });

  // Dynamic pie data
  const expenseCategories = Array.from(new Set(filteredSourceTransactions.filter(t => t.type === 'expense').map(t => t.category)));
  const dynamicPieData = expenseCategories.map(cat => {
    const total = Math.abs(filteredSourceTransactions
      .filter(t => t.type === 'expense' && t.category === cat)
      .reduce((sum, t) => sum + t.amount, 0));
    return { name: cat, value: total };
  }).sort((a, b) => b.value - a.value).slice(0, 4);

  const totalExpenseValue = dynamicPieData.reduce((sum, item) => sum + item.value, 0);
  const pieDataWithPercentage = dynamicPieData.map(item => ({
    ...item,
    value: totalExpenseValue > 0 ? Math.round((item.value / totalExpenseValue) * 100) : 0
  }));

  const projectRegions = Array.from(new Set(visibleProjects.map(p => p.region))).map((regionName: string) => {
    // For region stats, we use all projects in that region regardless of selectedProject
    const regionProjects = visibleProjects.filter(p => p.region === regionName).map(p => {
      const budgetValue = Math.round(Number(p.budget)) || 0;
      return { ca: budgetValue * (p.progress / 100) };
    });
    const totalCA = regionProjects.reduce((sum, p) => sum + p.ca, 0);
    return {
      id: regionName.substring(0, 2).toUpperCase(),
      name: regionName,
      projects: regionProjects.length,
      ca: totalCA > 1000000000 ? (totalCA / 1000000000).toFixed(1) + 'B' : (totalCA / 1000000).toFixed(0) + 'M',
      status: 'Actif'
    };
  });

  const filteredProjects = dashboardProjects;

  const exportToWord = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "RAPPORT MENSUEL CONSOLIDé - VAN BTP",
            heading: HeadingLevel.HEADING_1,
            alignment: "center",
          }),
          new Paragraph({
            text: `Date de génération: ${new Date().toLocaleDateString('fr-FR')}`,
            alignment: "right",
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "1. PERFORMANCE FINANCIÃˆRE",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Chiffre d'Affaires Total: ", bold: true }),
              new TextRun(`${formattedCA} FCFA`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Marge Nette: ", bold: true }),
              new TextRun(`${formattedMargin} FCFA`),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "2. éTAT D'AVANCEMENT DES CHANTIERS",
            heading: HeadingLevel.HEADING_2,
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Chantier", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Client", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Avancement", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Statut", bold: true })] })] }),
                ],
              }),
              ...dashboardProjects.map(p => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph(p.name)] }),
                  new TableCell({ children: [new Paragraph(p.client)] }),
                  new TableCell({ children: [new Paragraph(`${p.progress}%`)] }),
                  new TableCell({ children: [new Paragraph(p.status)] }),
                ],
              })),
            ],
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Rapport_Consolide_VAN_BTP_${new Date().toISOString().split('T')[0]}.docx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const fileName = `Rapport_Consolide_VAN_BTP_${new Date().toISOString().split('T')[0]}`;

    // Header stylisé
    doc.setFillColor(26, 54, 93); // #1a365d
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("VAN BTP - RAPPORT CONSOLIDé", 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Date de génération : ${new Date().toLocaleDateString('fr-FR')}`, 105, 30, { align: 'center' });

    // Section 1: Finances
    doc.setTextColor(26, 54, 93);
    doc.setFontSize(16);
    doc.text("1. RéSUMé FINANCIER", 14, 55);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 58, 196, 58);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("Indicateur", 14, 68);
    doc.text("Valeur", 105, 68);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Chiffre d'Affaires Total", 14, 76);
    doc.text(`${formattedCA} FCFA`, 105, 76);

    doc.text("Dépenses Engagées", 14, 84);
    doc.text(`${formattedExpenses} FCFA`, 105, 84);

    doc.text("Marge Nette Estimée", 14, 92);
    doc.setTextColor(16, 185, 129); // Success color
    doc.text(`${formattedMargin} FCFA`, 105, 92);

    // Section 2: Projets
    doc.setTextColor(26, 54, 93);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("2. éTAT D'AVANCEMENT DES CHANTIERS", 14, 110);

    doc.line(14, 113, 196, 113);

    const tableData = dashboardProjects.map(p => [
      p.code,
      p.name,
      p.client,
      `${p.progress}%`,
      p.status
    ]);

    autoTable(doc, {
      startY: 120,
      head: [['RéF', 'CHANTIER', 'CLIENT', 'PROGRÃˆS', 'STATUT']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        3: { halign: 'center', fontStyle: 'bold' }
      }
    });

    // Pied de page
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Document généré par l'ERP VAN BTP - Page ${i} sur ${pageCount}`, 105, 285, { align: 'center' });
    }

    doc.save(`${fileName}.pdf`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const fileName = `Rapport_Consolide_VAN_BTP_${new Date().toISOString().split('T')[0]}`;

    // Mapper les données en français pour l'export professionnel
    const exportData = dashboardProjects.map(p => ({
      'RéFéRENCE': p.code,
      'DéSIGNATION CHANTIER': p.name,
      'CLIENT': p.client,
      'RéGION': p.region,
      'LOCALISATION': p.location,
      'BUDGET GLOBAL (FCFA)': p.budget,
      'CA RéALISé (FCFA)': Math.round(p.ca),
      'AVANCEMENT (%)': `${p.progress}%`,
      'STATUT': p.status,
      'DATE DéBUT': p.start,
      'DATE FIN PRéVUE': p.end,
      'CONDUCTEUR TRAVAUX': p.manager
    }));

    if (exportFormat.includes('Excel')) {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Données Consolidées");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(dataBlob, `${fileName}.xlsx`);
    } else if (exportFormat.includes('CSV')) {
      exportToCSV(exportData, fileName);
    } else if (exportFormat.includes('PDF')) {
      exportToPDF();
    } else if (exportFormat.includes('Word')) {
      await exportToWord();
    }

    setIsExporting(false);
    setExportStep(3);
    notify(t('dashboard.notifications.export_success', { format: exportFormat.split(' ')[0] }), 'success', '/dashboard');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <Activity className="w-4 h-4" />
            <span>{t('dashboard.pilotage_prefix')} {t(`dashboard.roles.pilotage_${dashRole}`)}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            {t(`dashboard.roles.title_${dashRole}`)}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {t(`dashboard.roles.desc_${dashRole}`)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(role === 'Directeur technique') && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-white" onClick={() => setIsRegionFilterOpen(true)}>
                <Filter className="w-4 h-4 mr-2" />
                {selectedRegion}
              </Button>
              <Button variant="outline" size="sm" className="bg-white" onClick={() => setIsProjectFilterOpen(true)}>
                <HardHat className="w-4 h-4 mr-2" />
                {selectedProject === null ? null : visibleProjects.find(p => p.id === selectedProject)?.name || t('dashboard.unknown_site')}
              </Button>
            </div>
          )}
          {(role === 'Directeur technique') && (
            <Button size="sm" className="shadow-lg shadow-blue-900/20" onClick={() => { setIsExportModalOpen(true); setExportStep(1); }}>
              <Download className="w-4 h-4 mr-2" />
              {role === 'Chef_chantier' ? t('dashboard.export_consolidated') : t('dashboard.export_monthly')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(role === 'Directeur technique') && (
          <>
            <StatCard
              title={t('dashboard.stats.global_budget')}
              value={formattedBudget}
              unit="FCFA"
              change="+12.5%"
              isPositive={true}
              icon={Building2}
              trend={t('dashboard.stats.total_markets')}
              onClick={() => setActiveDeepDive('sites')}
            />
            <StatCard
              title={t('dashboard.invoice_amount')}
              value={formattedCA}
              unit="FCFA"
              change="+8.2%"
              isPositive={true}
              icon={TrendingUp}
              trend={t('dashboard.total_invoices')}
              onClick={() => setActiveDeepDive('ca')}
            />
            <StatCard
              title={t('dashboard.stats.total_collected')}
              value={formattedEncaisse}
              unit="FCFA"
              change="+5.4%"
              isPositive={true}
              icon={ArrowUpRight}
              trend={t('dashboard.stats.payments')}
              onClick={() => setActiveDeepDive('ca')}
            />
            <StatCard
              title={t('dashboard.engaged_expenses')}
              value={formattedExpenses}
              unit="FCFA"
              change="+15.2%"
              isPositive={false}
              icon={Banknote}
              trend={t('dashboard.total_expenses')}
              onClick={() => setActiveDeepDive('margin')}
            />
          </>
        )}
        {role === 'Chef_chantier' && (
          <>
            <StatCard
              title="Total Personnel"
              value={employees.length.toString()}
              unit="Employés"
              change="+2"
              isPositive={true}
              icon={Users}
              trend="Effectif Global"
            />
            <StatCard
              title="Chantiers Actifs"
              value={visibleProjects.length.toString()}
              unit="Sites"
              change="0"
              isPositive={true}
              icon={HardHat}
              trend="Affectations"
            />
            <StatCard
              title="Contrats CDI"
              value={employees.filter(e => e.contract === 'CDI').length.toString()}
              unit="CDI"
              change="+1"
              isPositive={true}
              icon={CheckCircle2}
              trend="Stabilité"
            />
            <StatCard
              title="Contrats CDD"
              value={employees.filter(e => e.contract === 'CDD').length.toString()}
              unit="CDD"
              change="+1"
              isPositive={false}
              icon={Clock}
              trend="Temporaires"
            />
          </>
        )}

      </div>

      {role === 'Directeur technique' && (
        <PendingApprovalsPanel
          initialData={backendKpis?.pendingApprovals ?? null}
          onUpdated={handlePendingApprovalsUpdated}
        />
      )}

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {role === 'Directeur technique' ? (
          <Card className="lg:col-span-2 p-8 border-none shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('dashboard.charts.financial_evolution')}</h3>
                <p className="text-sm text-slate-500 font-medium">{t('dashboard.invoice_vs_expenses')}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]"></div>
                  <span className="text-xs font-bold text-slate-600">{t('dashboard.invoice_amount')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]"></div>
                  <span className="text-xs font-bold text-slate-600">Dépenses</span>
                </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dynamicChartData}>
                  <defs>
                    <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600, opacity: 0.5 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600, opacity: 0.5 }} tickFormatter={(value) => `${value / 1000000}M`} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '16px',
                      border: 'none',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'rgb(var(--color-bg-rgb, 255, 255, 255))',
                      color: 'inherit'
                    }}
                    formatter={(value: any) => [`${value.toLocaleString()} FCFA`]}
                  />
                  <Area type="monotone" dataKey="ca" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCa)" />
                  <Area type="monotone" dataKey="expenses" stroke="var(--color-accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                  {/* Masquage des zones hors-projet si un projet est sélectionné */}
                  {selectedProject !== null && (
                    <Area
                      type="step"
                      dataKey={(d: any) => d.isActive ? 0 : 1000000000} // Valeur haute pour couvrir le reste
                      stroke="none"
                      fill="#f1f5f9"
                      fillOpacity={0.5}
                      connectNulls={true}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : null}

        <Card className="p-8 border-none shadow-xl shadow-slate-200/50 flex flex-col">
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            {(role === 'Directeur technique') ? 'Structure des Couts' : 'Répartition par Poste'}
          </h3>
          <p className="text-sm text-slate-500 font-medium mb-8">
            {(role === 'Directeur technique') ? 'Répartition par poste de dépense' : 'Répartition des effectifs par catégorie'}
          </p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-[240px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataWithPercentage}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {pieDataWithPercentage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900">100%</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                  {t('dashboard.total_costs')}
                </span>
              </div>
            </div>
            <div className="w-full space-y-3 mt-8">
              {pieDataWithPercentage.map((item, i) => (
                  <div key={item.name || `pie-legend-${i}`} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                      <span className="text-sm text-slate-700 font-bold">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{item.value}%</span>
                  </div>
                ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Section: Projects & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border-none shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('dashboard.performance_by_site')}</h3>
            <Button variant="ghost" size="sm" className="text-[var(--color-primary)] font-bold">
              Voir tout <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="pb-4">{t('dashboard.client_owner')}</th>
                  <th className="pb-4">{t('dashboard.budget_invoice')}</th>
                  <th className="pb-4">Marge</th>
                  <th className="pb-4">Avancement</th>
                  <th className="pb-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    name={project.name}
                    client={project.client}
                    budget={project.budget}
                    ca={project.ca}
                    margin={project.margin}
                    progress={project.progress}
                    status={project.status}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* {t('dashboard.alerts')} Card - Uniquement pour DG et Chef */}
        {(role === 'Directeur technique') && (
          <Card
            id="business-alerts"
            className={cn(
              'p-8 bg-slate-900 text-white border-none shadow-2xl shadow-blue-900/20 scroll-mt-6 transition-shadow duration-500',
              alertsHighlight && 'ring-4 ring-yellow-400/80 ring-offset-2 ring-offset-slate-100',
            )}
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                {t('dashboard.alerts')}
              </h3>
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">{criticalIncidents} CRITIQUES</span>
            </div>
            <div className="space-y-4">
              {/* Dynamic Alerts from Projects (80% budget consumption) */}
              {filteredSourceProjects.map(p => {
                const budget = Math.round(Number(p.budget)) || 0;
                const projectExpenses = Math.abs(filteredSourceTransactions
                  .filter(t => t.projectId === p.id && t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0));

                if (budget > 0 && projectExpenses >= budget * 0.8) {
                  return (
                    <AlertItem
                      key={`alert-budget-${p.id}`}
                      type="danger"
                      title="Alerte Budget (80%)"
                      desc={`${p.name} - Consommation: ${new Intl.NumberFormat('fr-FR').format(projectExpenses)} FCFA`}
                      onClick={() => setSelectedAlert({
                        title: 'Alerte Budget (80%)',
                        chantier: p.name,
                        budget: new Intl.NumberFormat('fr-FR').format(budget) + ' FCFA',
                        depenses: new Intl.NumberFormat('fr-FR').format(projectExpenses) + ' FCFA',
                        ratio: Math.round((projectExpenses / budget) * 100) + '%'
                      })}
                    />
                  );
                }
                return null;
              })}

              {/* Dynamic Alerts from Incidents */}
              {filteredSourceIncidents.slice(0, 4).map(incident => (
                <AlertItem
                  key={`alert-incident-${incident.id}`}
                  type={incident.gravity === 'Critique' ? 'danger' : 'warning'}
                  title={`Incident: ${incident.type}`}
                  desc={`${visibleProjects.find(p => p.id === incident.projectId)?.name || 'Chantier inconnu'} - ${incident.desc}`}
                  onClick={() => openIncidentAlertDetail(incident)}
                />
              ))}

              {/* Fallback if no dynamic alerts */}
              {filteredSourceProjects.every(p => {
                const budget = Math.round(Number(p.budget)) || 0;
                const projectExpenses = Math.abs(filteredSourceTransactions.filter(t => t.projectId === p.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
                return budget === 0 || projectExpenses < budget * 0.8;
              }) && filteredSourceIncidents.length === 0 && (
                  <div className="py-8 text-center border border-dashed border-slate-700 rounded-2xl">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('dashboard.no_alert')}</p>
                  </div>
                )}
            </div>
            <Button
              variant="outline"
              onClick={() => setIsAlertCenterModalOpen(true)}
              className="w-full mt-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-bold"
            >{t('dashboard.see_alerts')}</Button>
          </Card>
        )}
      </div>

      {/* Drill Down Modal Simulation */}
      <AnimatePresence>
        {selectedAlert && (() => {
          const selectedAlertImages = getIncidentImagesFromRecord(selectedAlert);
          return (
          <Modal
            isOpen={!!selectedAlert}
            onClose={() => setSelectedAlert(null)}
            title={t('dashboard.modals.alert_detail', { title: selectedAlert.title })}
            size="lg"
          >
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">{t('dashboard.critical_analysis')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(selectedAlert).filter(([k, v]) => (
                    k && k !== 'title' && k !== 'image' && k !== 'images' && k !== 'incidentId'
                    && v != null && v !== '' && !Array.isArray(v)
                  )).map(([key, value]: any) => {
                    const alertFieldKeys = ['chantier', 'budget', 'depenses', 'ratio', 'type', 'description', 'date', 'statut'];
                    const label = alertFieldKeys.includes(key)
                      ? t(`dashboard.modals.alert_fields.${key}`)
                      : key.charAt(0).toUpperCase() + key.slice(1);

                    return (
                      <div key={key} className={cn("space-y-1", key === 'description' && "col-span-full")}>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                        <p className="text-sm font-black text-slate-900">{value}</p>
                      </div>
                    );
                  })}

                  {selectedAlertImages.length > 0 && (
                    <div className="col-span-full mt-4">
                      <ReportPhotos
                        images={selectedAlertImages}
                        reportId={selectedAlert.incidentId ?? selectedAlert.title ?? 'alert'}
                      />
                    </div>
                  )}
                </div>
              </div>

              {(role === 'Directeur technique') && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Actions de Remédiation Immédiates</h4>
                  <Button
                    className="w-full justify-between group h-14 rounded-2xl"
                    onClick={() => {
                      setIsConvoquerModalOpen(true);
                      setSelectedAlert(null);
                    }}
                  >
                    <span>Convoquer le Conducteur de Travaux</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-between group h-14 rounded-2xl border-slate-200"
                    onClick={() => {
                      setIsIncidentModalOpen(true);
                      setSelectedAlert(null);
                    }}
                  >
                    <span>Générer un rapport d'incident pour le Client</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:bg-red-50 font-bold h-14 rounded-2xl"
                    onClick={() => {
                      setIsEscaladerModalOpen(true);
                      setSelectedAlert(null);
                    }}
                  >
                    Escalader au Comité de Direction
                  </Button>
                </div>
              )}
            </div>
          </Modal>
          );
        })()}

        {/* Alert Center Modal */}
        {isAlertCenterModalOpen && (
          <Modal
            isOpen={isAlertCenterModalOpen}
            onClose={() => setIsAlertCenterModalOpen(false)}
            title={t('dashboard.modals.alert_center')}
            size="lg"
          >
            <div className="space-y-6">
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setAlertCenterTab('active')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    alertCenterTab === 'active' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {t('dashboard.modals.active_alerts')}
                </button>
                <button
                  onClick={() => setAlertCenterTab('history')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    alertCenterTab === 'history' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {t('dashboard.modals.history_closed')}
                </button>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {alertCenterTab === 'active' ? (
                  <>
                    {/* Budget Alerts */}
                    {filteredSourceProjects.map(p => {
                      const budget = Math.round(Number(p.budget)) || 0;
                      const projectExpenses = Math.abs(filteredSourceTransactions
                        .filter(t => t.projectId === p.id && t.type === 'expense')
                        .reduce((sum, t) => sum + t.amount, 0));

                      if (budget > 0 && projectExpenses >= budget * 0.8) {
                        return (
                          <div key={`center-budget-${p.id}`} className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm font-black uppercase tracking-tight">Alerte Budget (80%)</span>
                              </div>
                              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Automatique</span>
                            </div>
                            <p className="text-xs font-bold text-slate-900">{p.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-1">
                              Consommation: {new Intl.NumberFormat('fr-FR').format(projectExpenses)} / {new Intl.NumberFormat('fr-FR').format(budget)} FCFA
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })}

                    {/* Active Incidents */}
                    {incidents.filter(i => i.status !== 'Fermé').map(incident => (
                      <div
                        key={`center-incident-${incident.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => openIncidentAlertDetail(incident)}
                        onKeyDown={(e) => e.key === 'Enter' && openIncidentAlertDetail(incident)}
                        className="p-4 bg-white border border-slate-100 rounded-2xl space-y-4 cursor-pointer hover:border-[var(--color-primary)]/40 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              incident.gravity === 'Critique' ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                            )}>
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{incident.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{visibleProjects.find(p => p.id === incident.projectId)?.name || 'Chantier inconnu'} • {incident.type}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                            incident.gravity === 'Critique' ? "bg-red-600 text-white" : "bg-orange-500 text-white"
                          )}>
                            {incident.gravity}
                          </span>
                        </div>

                        {getIncidentImagesFromRecord(incident).length > 0 && (
                          <div className="pt-4 border-t border-slate-50">
                            <ReportPhotos
                              images={getIncidentImagesFromRecord(incident)}
                              reportId={incident.id}
                            />
                          </div>
                        )}

                        <div className="pt-4 border-t border-slate-50">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Historique des modifications</p>
                          <div className="space-y-2">
                            {(incident.history || [{ date: incident.date, action: 'Incident déclaré', user: incident.reporter }]).map((h: any, idx: number) => (
                              <div key={idx} className="flex gap-2 text-[10px]">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0"></div>
                                <p className="font-bold text-slate-600">
                                  <span className="text-slate-400">{h.date}</span> • {h.action} par <span className="text-[var(--color-primary)]">{h.user}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Closed Incidents */}
                    {incidents.filter(i => i.status === 'Fermé').map(incident => (
                      <div key={`center-closed-${incident.id}`} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl opacity-75 grayscale-[0.5] space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{incident.title}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{visibleProjects.find(p => p.id === incident.projectId)?.name || 'Chantier inconnu'} • {incident.type}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                            FERMé
                          </span>
                        </div>

                        {getIncidentImagesFromRecord(incident).length > 0 && (
                          <div className="pt-4 border-t border-slate-100">
                            <ReportPhotos
                              images={getIncidentImagesFromRecord(incident)}
                              reportId={incident.id}
                            />
                          </div>
                        )}

                        <div className="pt-4 border-t border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Historique complet</p>
                          <div className="space-y-2">
                            {(incident.history || [{ date: incident.date, action: 'Incident déclaré', user: incident.reporter }]).map((h: any, idx: number) => (
                              <div key={idx} className="flex gap-2 text-[10px]">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1 shrink-0"></div>
                                <p className="font-bold text-slate-600">
                                  <span className="text-slate-400">{h.date}</span> • {h.action} par <span className="text-slate-900">{h.user}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    {incidents.filter(i => i.status === 'Fermé').length === 0 && (
                      <div className="py-12 text-center">
                        <p className="text-sm font-bold text-slate-400 italic">Aucune alerte archivée.</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button variant="outline" onClick={() => setIsAlertCenterModalOpen(false)} className="font-bold">{t('dashboard.close_center')}</Button>
              </div>
            </div>
          </Modal>
        )}


        {/* Convoquer Modal */}
        {isConvoquerModalOpen && (
          <Modal
            isOpen={isConvoquerModalOpen}
            onClose={() => setIsConvoquerModalOpen(false)}
            title={t('dashboard.modals.summon_title')}
          >
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-bold text-amber-700">Cette action enverra une notification prioritaire au conducteur de travaux concerné.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Objet de la Convocation</label>
                <input type="text" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]" defaultValue="Urgent: Revue de performance et alertes critiques" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Message / Instructions</label>
                <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Détaillez les points Ã  aborder..."></textarea>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button variant="outline" onClick={() => setIsConvoquerModalOpen(false)} disabled={isSubmitting}>{t('common.cancel')}</Button>
                <Button
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await new Promise(r => setTimeout(r, 1000)); // Simulate API
                      setIsConvoquerModalOpen(false);
                      notify(t('dashboard.notifications.convocation_sent'), "success");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="font-bold shadow-lg shadow-blue-900/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('common.modals.processing')}
                    </>
                  ) : (
                    'Envoyer la Convocation'
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Incident Report Modal */}
        {isIncidentModalOpen && (
          <Modal
            isOpen={isIncidentModalOpen}
            onClose={() => setIsIncidentModalOpen(false)}
            title={t('dashboard.modals.incident_report_title')}
            size="lg"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Type d'Incident</label>
                  <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                    <option>Dépassement Budgétaire</option>
                    <option>Retard Critique</option>
                    <option>Incident HSE</option>
                    <option>Problème Qualité</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Gravité</label>
                  <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                    <option>Critique</option>
                    <option>Majeur</option>
                    <option>Mineur</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Description des Faits</label>
                <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Décrivez l'incident de manière factuelle..."></textarea>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-700">Le rapport sera automatiquement formaté selon la charte VAN BTP et envoyé au client après validation.</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button variant="outline" onClick={() => setIsIncidentModalOpen(false)} disabled={isSubmitting}>{t('common.cancel')}</Button>
                <Button
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await new Promise(r => setTimeout(r, 1000)); // Simulate API
                      setIsIncidentModalOpen(false);
                      notify(t('dashboard.notifications.report_generated'), "success");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="font-bold shadow-lg shadow-blue-900/20"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('common.modals.processing')}
                    </>
                  ) : (
                    'Générer le Rapport'
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Escalader Modal */}
        {isEscaladerModalOpen && (
          <Modal
            isOpen={isEscaladerModalOpen}
            onClose={() => setIsEscaladerModalOpen(false)}
            title={t('dashboard.modals.escalate_title')}
          >
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">Confirmer l'escalade</h4>
              <p className="text-sm text-slate-500 font-medium">Cette action enverra une alerte critique Ã  tous les membres du CODIR.</p>
              <div className="pt-6 border-t border-slate-100 flex justify-center gap-3">
                <Button variant="outline" onClick={() => setIsEscaladerModalOpen(false)} disabled={isSubmitting}>{t('common.cancel')}</Button>
                <Button
                  className="font-bold bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-900/20"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await new Promise(r => setTimeout(r, 1000)); // Simulate API
                      setIsEscaladerModalOpen(false);
                      notify(t('dashboard.notifications.escalation_sent'), "error");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('common.modals.processing')}
                    </>
                  ) : (
                    "Confirmer l'Escalade"
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Region Filter Workflow */}
        {isRegionFilterOpen && (
          <Modal
            isOpen={isRegionFilterOpen}
            onClose={() => setIsRegionFilterOpen(false)}
            title={t('dashboard.modals.region_analysis')}
            size="lg"
          >
            <div className="space-y-6">
              <p className="text-sm text-slate-500 font-medium">Sélectionnez une région pour filtrer les données du tableau de bord.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => { setSelectedRegion('__all_regions__'); setIsRegionFilterOpen(false); }}
                  className={cn(
                    "p-6 bg-slate-50 border rounded-2xl text-left transition-all group",
                    selectedRegion === '__all_regions__' ? "border-[var(--color-primary)] bg-white" : "border-slate-100 hover:border-[var(--color-primary)]"
                  )}
                >
                  <h4 className="text-xl font-black text-slate-900 mb-1">{t('dashboard.all_regions')}</h4>
                  <p className="text-xs font-bold text-slate-500">Vue consolidée nationale</p>
                </button>
                {projectRegions.map((region) => (
                  <button
                    key={region.name}
                    onClick={() => { setSelectedRegion(region.name); setIsRegionFilterOpen(false); }}
                    className={cn(
                      "p-6 bg-slate-50 border rounded-2xl text-left transition-all group",
                      selectedRegion === region.name ? "border-[var(--color-primary)] bg-white" : "border-slate-100 hover:border-[var(--color-primary)]"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{region.id}</span>
                      <span className="text-[10px] font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg uppercase">{region.status}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">{region.name}</h4>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <span>{region.projects} Chantiers</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                      <span>{t('dashboard.invoice_amount')}: {region.ca} FCFA</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button variant="outline" onClick={() => setIsRegionFilterOpen(false)}>{t('common.close')}</Button>
              </div>
            </div>
          </Modal>
        )}

        {isProjectFilterOpen && (
          <Modal
            isOpen={isProjectFilterOpen}
            onClose={() => setIsProjectFilterOpen(false)}
            title={t('dashboard.modals.filter_project')}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => { setSelectedProject(null); setIsProjectFilterOpen(false); }}
                  className={cn(
                    "p-6 bg-slate-50 border rounded-2xl text-left transition-all group",
                    selectedProject === null ? "border-[var(--color-primary)] bg-white" : "border-slate-100 hover:border-[var(--color-primary)]"
                  )}
                >
                  <h4 className="text-xl font-black text-slate-900 mb-1">{t('dashboard.all_projects')}</h4>
                  <p className="text-xs font-bold text-slate-500">Vue consolidée de l'entreprise</p>
                </button>
                {visibleProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => { setSelectedProject(project.id); setIsProjectFilterOpen(false); }}
                    className={cn(
                      "p-6 bg-slate-50 border rounded-2xl text-left transition-all group",
                      selectedProject === project.id ? "border-[var(--color-primary)] bg-white" : "border-slate-100 hover:border-[var(--color-primary)]"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{project.code}</span>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-1 rounded-lg uppercase",
                        project.status === 'clôture' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      )}>{project.status}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mb-1">{project.name}</h4>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                      <span>{project.client}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <Button variant="outline" onClick={() => setIsProjectFilterOpen(false)}>{t('common.close')}</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Export Report Workflow (Wizard) */}
        {isExportModalOpen && (
          <Modal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            title={t('dashboard.modals.export_wizard_title')}
          >
            <div className="space-y-8">
              {/* Stepper */}
              <div className="flex items-center justify-between px-8 relative">
                <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
                {[1, 2, 3].map((step) => (
                  <div key={step} className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                    exportStep >= step ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
                  )}>
                    {step}
                  </div>
                ))}
              </div>

              {exportStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h4 className="text-lg font-black text-slate-900">1. Sélection des Modules</h4>
                  <p className="text-sm text-slate-500 font-medium">Cochez les sections Ã  inclure dans le rapport consolidé.</p>
                  <div className="space-y-3">
                    {['Performance Financière (Facturation, Marges, AIR)', 'état d\'Avancement des Chantiers', 'Gestion des Ressources (RH & Matériel)', 'Analyse des Risques & Alertes'].map((module) => (
                      <label key={module} className="flex items-center p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] mr-4" />
                        <span className="text-sm font-bold text-slate-700">{module}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {exportStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h4 className="text-lg font-black text-slate-900">2. Paramètres de Sortie</h4>
                  <p className="text-sm text-slate-500 font-medium">Définissez le format et les destinataires du rapport.</p>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Format du Fichier</label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option>Excel Professionnel (.xlsx)</option>
                        <option>CSV Professionnel (Excel compatible)</option>
                        <option>Word Stratégique (Haute Qualité)</option>
                        <option>PDF Stratégique (Haute Qualité)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Diffusion Automatique</label>
                      <div className="flex flex-wrap gap-2">
                        {['DG', 'DGA', 'Directeur Financier', 'Conducteurs de Travaux'].map(tag => (
                          <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {exportStep === 3 && (
                <div className="space-y-6 text-center py-8 animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900">Rapport Pret !</h4>
                  <p className="text-slate-500 font-medium max-w-xs mx-auto">Le rapport mensuel consolidé a été généré avec succès et téléchargé.</p>
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-between">
                <Button variant="ghost" onClick={() => exportStep > 1 ? setExportStep(exportStep - 1) : setIsExportModalOpen(false)} disabled={isExporting}>
                  {exportStep === 1 ? t('common.cancel') : t('common.modals.previous')}
                </Button>
                {exportStep === 1 && (
                  <Button onClick={() => setExportStep(2)} className="px-8 font-bold">
                    {t('common.next')} <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {exportStep === 2 && (
                  <Button onClick={handleExport} className="px-8 font-bold shadow-lg shadow-blue-900/20" disabled={isExporting}>
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        {t('common.modals.processing')}
                      </>
                    ) : (
                      t('common.modals.generate_download')
                    )}
                  </Button>
                )}
                {exportStep === 3 && (
                  <Button onClick={() => setIsExportModalOpen(false)} className="px-8 font-bold">{t('common.finish')}</Button>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Deep Dive Analytics Workflow */}
        {activeDeepDive && (
          <Modal
            isOpen={!!activeDeepDive}
            onClose={() => setActiveDeepDive(null)}
            title={t('dashboard.modals.deep_dive_title', {
              label: activeDeepDive === 'ca' ? t('dashboard.invoice_amount') : activeDeepDive === 'expenses' ? t('dashboard.charts.expenses') : activeDeepDive === 'margin' ? t('dashboard.stats.net_margin') : t('projects.title')
            })}
            size="lg"
          >
            <div className="space-y-8">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dynamicChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <Tooltip
                      formatter={(value: number) => [`${new Intl.NumberFormat('fr-FR').format(value)} FCFA`, '']}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey={activeDeepDive === 'ca' ? 'ca' : activeDeepDive === 'expenses' ? 'expenses' : 'margin'} fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Insights Stratégiques Réels</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Valeur Totale</p>
                    <p className="text-lg font-black text-slate-900">
                      {activeDeepDive === 'ca' ? formattedCA : activeDeepDive === 'expenses' ? formattedExpenses : formattedMargin} FCFA
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Nombre d'opérations</p>
                    <p className="text-lg font-black text-slate-900">
                      {filteredSourceTransactions.filter(t =>
                        activeDeepDive === 'ca' ? t.type === 'invoice' :
                          activeDeepDive === 'expenses' ? t.type === 'expense' : true
                      ).length}
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm font-medium text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0"></div>
                    {activeDeepDive === 'ca' ?
                      `Le montant facturé total de ${formattedCA} FCFA est réparti sur ${filteredSourceProjects.length} chantiers actifs.` :
                      activeDeepDive === 'expenses' ?
                        `Les dépenses engagées s'élèvent Ã  ${formattedExpenses} FCFA, principalement concentrées sur les matériaux.` :
                        `La trésorerie nette actuelle est de ${formattedMargin} FCFA après déduction de toutes les dépenses validées.`
                    }
                  </li>
                </ul>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setActiveDeepDive(null)}>Fermer l'Analyse</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  );
};
