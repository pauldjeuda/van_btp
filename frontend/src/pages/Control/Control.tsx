import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  Plus,
  MapPin,
  Clock,
  Camera,
  User,
  Search,
  Filter,
  ChevronRight,
  ClipboardCheck,
  Eye,
  CheckSquare,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Trash2,
  Edit,
  Download,
  ArrowUpDown,
  Check,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { exportToCSV } from '../../lib/exportUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { useHistory } from '../../context/HistoryContext';
import { useUser } from '../../context/UserContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { ControlKpiCard, ChecklistItem, AuditItem } from './ControlComponents';
import { ReportPhotos } from '../../components/project/ReportPhotos';

export const ControlPage = () => {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { addLog } = useHistory();
  const { profile, role } = useUser();
  const name = profile?.name;
  const { projects, incidents, addIncident, updateIncident, audits, addAudit, employees, checklists, addChecklist, updateChecklist, deleteChecklist, toggleChecklistTask } = useData();
  const { notify } = useNotification();

  const getProjectNameById = (projectId?: number) => projects.find(p => p.id === projectId)?.name || 'Chantier inconnu';
  const getProjectIdByName = (name?: string) => projects.find(p => p.name === name)?.id || 0;

  const currentEmployee = employees.find(e => e.matricule === profile?.matricule);
  const technicianProjectId = currentEmployee?.projectId || getProjectIdByName(currentEmployee?.project);

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentStep, setIncidentStep] = useState(1);
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditStep, setAuditStep] = useState(1);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'hse' | 'quality'>('all');
  const [controlTab, setControlTab] = useState<'incidents' | 'audits' | 'checklists'>('incidents');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<number | null>(null);

  // New States
  const [isFullHistoryModalOpen, setIsFullHistoryModalOpen] = useState(false);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [statusUpdateComment, setStatusUpdateComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [isUpdatingChecklist, setIsUpdatingChecklist] = useState(false);

  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [isNewChecklistModalOpen, setIsNewChecklistModalOpen] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [newChecklistProjectId, setNewChecklistProjectId] = useState(projects[0]?.id || 0);
  const [newChecklistTasks, setNewChecklistTasks] = useState<string[]>([""]);
  const [editingChecklist, setEditingChecklist] = useState<any>(null);
  const [isEditChecklistModalOpen, setIsEditChecklistModalOpen] = useState(false);
  const [editChecklistTitle, setEditChecklistTitle] = useState("");
  const [selectedChecklist, setSelectedChecklist] = useState<any>(null);

  const mapGravityToDb = (g: string) => {
    const map: Record<string, string> = {
      Faible: 'Mineur',
      Moyen: 'Modéré',
      Haut: 'Grave',
      Critique: 'Critique',
    };
    return map[g] || g || 'Mineur';
  };

  const [newIncident, setNewIncident] = useState({
    type: 'Accident de travail',
    gravity: 'Moyen',
    projectId: 0,
    desc: '',
    title: ''
  });

  useEffect(() => {
    if (!projects.length) return;
    setNewIncident((prev) => {
      const valid = projects.some((p) => p.id === prev.projectId);
      if (valid && prev.projectId) return prev;
      return { ...prev, projectId: projects[0].id };
    });
  }, [projects]);

  const [newAudit, setNewAudit] = useState({
    type: 'Inspection HSE Terrain',
    projectId: projects[0]?.id || 0,
    auditor: '',
    date: '',
    location: '',
    observations: '',
    recommendations: '',
    score: ''
  });

  const AUDIT_TYPES = [
    'Inspection HSE Terrain',
    'Contrôle Qualité Ouvrage',
    'Visite de Conformité',
    'Audit Sécurité Chantier',
    'Réception Partielle Travaux',
    'Vérification Matériaux',
    'Contrôle Métrés',
    'Autre',
  ];

  const incidentsData: any[] = [];

  const effectiveProjectFilter = selectedProjectFilter;

  const filteredIncidents = incidents.filter(incident => {
    const matchesTab = activeTab === 'all' || incident.category === activeTab;
    const matchesProject = effectiveProjectFilter === null || incident.projectId === effectiveProjectFilter;
    return matchesTab && matchesProject;
  });

  const filteredAudits = audits.filter(audit =>
    effectiveProjectFilter === null || audit.projectId === effectiveProjectFilter
  );

  const [incidentImages, setIncidentImages] = useState<string[]>([]);
  const [incidentFiles, setIncidentFiles] = useState<File[]>([]);

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (incidentFiles.length + files.length > 10) {
      notify(t('control.photos_max'), 'error');
      return;
    }
    const nextFiles = [...incidentFiles, ...files].slice(0, 10);
    setIncidentFiles(nextFiles);
    const readers = nextFiles.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }),
    );
    Promise.all(readers).then(setIncidentImages);
    e.target.value = '';
  };

  const removeIncidentPhoto = (index: number) => {
    setIncidentFiles((prev) => prev.filter((_, i) => i !== index));
    setIncidentImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incidentStep < 2) {
      if (!newIncident.projectId || !projects.some((p) => p.id === newIncident.projectId)) {
        notify(t('control.invalid_site'), 'error');
        return;
      }
      setIncidentStep(incidentStep + 1);
    } else {
      if (isSubmittingIncident) return; // Protection contre les clics multiples

      setIsSubmittingIncident(true);
      try {
        const incidentId = Date.now();
        const incidentTitle = newIncident.title || `${newIncident.type} - ${getProjectNameById(newIncident.projectId)}`;
        await addIncident({
          projectId: newIncident.projectId,
          type: newIncident.type,
          category: newIncident.type.toLowerCase().includes('accident') || newIncident.type.toLowerCase().includes('hse') || newIncident.type.toLowerCase().includes('pollution') ? 'hse' : 'quality',
          // Mapper 'Moyen' vers 'Modéré' (ENUM DB: Mineur/Modéré/Grave/Critique)
          gravity: mapGravityToDb(newIncident.gravity),
          title: incidentTitle,
          description: newIncident.desc,
          incidentDate: new Date().toISOString().split('T')[0],
          // status ENUM DB: 'Ouvert', 'En cours de traitement', 'Résolu', 'Fermé'
          status: 'Ouvert',
          actionPlan: 'Analyse en cours par le responsable HSE.',
          impact: 'Évaluation de l\'impact en cours.',
          imageFiles: incidentFiles
        });
        addLog({
          module: 'Contrôle',
          action: `Déclaration d'un incident: ${incidentTitle}`,
          user: name || 'Utilisateur',
          type: 'danger'
        });
        notify(`Incident "${incidentTitle}" déclaré avec succès.`, 'warning', '/control');
        setIsIncidentModalOpen(false);
        setIncidentStep(1);
        setIncidentImages([]);
        setIncidentFiles([]);
        setNewIncident({
          type: 'Accident de travail',
          gravity: 'Moyen',
          projectId: projects[0]?.id || 0,
          desc: '',
          title: '',
        });
      } catch (err: any) {
        notify(err?.message || 'Erreur lors de la déclaration de l\'incident', 'error');
      } finally {
        setIsSubmittingIncident(false);
      }
    }
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auditStep < 2) {
      setAuditStep(auditStep + 1);
    } else {
      if (isSubmittingAudit) return; // Protection contre les clics multiples

      setIsSubmittingAudit(true);
      try {
        await addAudit({
          title: newAudit.type,
          auditDate: newAudit.date || new Date().toISOString().split('T')[0],
          auditor: newAudit.auditor,
          location: newAudit.location,
          projectId: newAudit.projectId,
          status: 'Planifié',
          observations: newAudit.observations || '',
          recommendations: newAudit.recommendations || '',
          score: newAudit.score ? Number(newAudit.score) : undefined
        });
        addLog({
          module: 'Contrôle',
          action: `Planification d'un audit: ${newAudit.type} sur ${getProjectNameById(newAudit.projectId)}`,
          user: name || 'Utilisateur',
          type: 'info'
        });
        notify(`Audit "${newAudit.type}" planifié avec succès.`, 'success', '/control');
        setIsAuditModalOpen(false);
        setAuditStep(1);
        setNewAudit({
          type: 'Inspection HSE Terrain',
          projectId: projects[0]?.id || 0,
          auditor: '',
          date: '',
          location: '',
          observations: '',
          recommendations: '',
          score: ''
        });
      } catch (err: any) {
        notify(err?.message || 'Erreur lors de la planification de l\'audit', 'error');
      } finally {
        setIsSubmittingAudit(false);
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>{t('control.title')}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{t('control.piloting')}</h1>
          <p className="text-slate-500 font-medium mt-1">Garantir la sécurité des hommes et la qualité des ouvrages selon les normes MINTP/MINSANTE</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(role === 'Chef_chantier' || role === 'Chef_chantier' || role === 'Chef_chantier') && (
            <Button variant="outline" onClick={() => setIsAuditModalOpen(true)} className="bg-white border-slate-200 h-12 px-6 font-bold">
              <ClipboardCheck className="w-5 h-5 mr-2" />
              {t('control.new_check')}
            </Button>
          )}
          {(role === 'Chef_chantier' || role === 'Chef_chantier') && (
            <Button variant="danger" onClick={() => setIsIncidentModalOpen(true)} className="shadow-lg shadow-red-900/20 h-12 px-6 font-bold">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {t('control.new_incident')}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4 border-none shadow-lg shadow-slate-200/50 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
            <Filter className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('control.filter_by_site')}</p>
            <select
              value={selectedProjectFilter ?? ''}
              onChange={(e) => setSelectedProjectFilter(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-transparent text-sm font-black text-slate-900 outline-none cursor-pointer"
            >
              <option key="filter-all-projects" value="">Tous les chantiers</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </Card>
        <ControlKpiCard
          title={t('control.modals.open_incidents')}
          value={filteredIncidents.filter(i => i.status !== 'Résolu').length.toString()}
          change={filteredIncidents.filter(i => i.status !== 'Résolu').length > 0 ? "+1" : "0"}
          isPositive={filteredIncidents.filter(i => i.status !== 'Résolu').length === 0}
          icon={FileWarning}
          color="red"
        />
        <ControlKpiCard
          title={t('control.modals.open_audits')}
          value={filteredAudits.length.toString()}
          change={filteredAudits.length > 0 ? `+${filteredAudits.length}` : "0"}
          isPositive={true}
          icon={ClipboardCheck}
          color="blue"
        />
      </div>

      {/* Onglets principaux */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {([
          { key: 'incidents', label: 'Incidents' },
          { key: 'audits', label: 'Audits Terrain' },
          { key: 'checklists', label: 'Checklists' },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setControlTab(tab.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
              controlTab === tab.key ? 'bg-white shadow text-[var(--color-primary)]' : 'text-slate-500 hover:text-slate-700')}>
            {tab.label}
          </button>
        ))}
      </div>

      {controlTab === 'incidents' && (
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{t('control.incidents_register')}</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('all')}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'all' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700")}
              >
                Tout
              </button>
              <button
                onClick={() => setActiveTab('hse')}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'hse' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700")}
              >
                HSE
              </button>
              <button
                onClick={() => setActiveTab('quality')}
                className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'quality' ? "bg-white shadow-sm text-[var(--color-primary)]" : "text-slate-500 hover:text-slate-700")}
              >
                Qualité
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4 flex-1">
            {filteredIncidents.filter(i => i.status !== 'Fermé').length > 0 ? filteredIncidents.filter(i => i.status !== 'Fermé').map((incident) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedIncident(incident)}
                className="p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg transition-all group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      incident.gravity === 'Critique' ? "bg-red-100 text-red-600" :
                        incident.gravity === 'Haute' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                    )}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{incident.type}</span>
                      <h4 className="text-sm font-black text-slate-900 leading-tight">{incident.title}</h4>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1",
                      incident.gravity === 'Critique' ? "bg-red-600 text-white" :
                        incident.gravity === 'Haute' ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                    )}>
                      {incident.gravity}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{incident.date}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 font-medium mb-4 line-clamp-2">{incident.desc}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center text-blue-600"><MapPin className="w-3 h-3 mr-1" /> {incident.location}</span>
                    <span className="flex items-center"><User className="w-3 h-3 mr-1" /> {incident.reporter || t('common.modals.not_defined')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-black uppercase px-2 py-1 rounded-lg",
                      incident.status === 'Résolu' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}>
                      {incident.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--color-primary)] transition-colors" />
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold">{t('control.no_incident')}</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-center">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-slate-500" onClick={() => setIsFullHistoryModalOpen(true)}>
              Voir l'historique complet des incidents
            </Button>
          </div>
        </Card>
      )}

      {controlTab === 'audits' && (
        <Card className="p-8 border-none shadow-xl shadow-slate-200/50 ">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-6">{t('control.next_audits')}</h3>
          <div className="space-y-4">
            {filteredAudits.length > 0 ? filteredAudits.map((audit) => (
              <AuditItem
                key={audit.id}
                title={audit.title}
                date={audit.date}
                auditor={audit.auditor}
                onClick={() => setSelectedAudit(audit)}
              />
            )) : (
              <div className="py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p className="text-slate-400 text-xs font-bold">{t('control.no_audit')}</p>
              </div>
            )}
          </div>
          {(role === 'Chef_chantier' || role === 'Chef_chantier' || role === 'Chef_chantier') && (
            <Button
              onClick={() => setIsAuditModalOpen(true)}
              className="w-full mt-8 bg-white text-blue-900 hover:bg-blue-50 font-bold border-none"
            >
              {t('control.plan_audit')}
            </Button>
          )}
        </Card>
      )}

      {controlTab === 'checklists' && (
        <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{t('control.control_checklists')}</h3>
            <CheckSquare className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="space-y-4">
            {checklists.filter(c => effectiveProjectFilter === null || c.projectId === effectiveProjectFilter).map((checklist) => (
              <ChecklistItem
                key={checklist.id}
                checklist={checklist}
                onToggleTask={(taskId: string) => toggleChecklistTask(checklist.id, taskId)}
                onClick={() => setSelectedChecklist(checklist)}
                getProjectName={getProjectNameById}
              />
            ))}
            {checklists.filter(c => effectiveProjectFilter === null || c.projectId === effectiveProjectFilter).length === 0 && (
              <p className="text-center py-4 text-slate-400 text-xs font-bold italic">{t('control.no_checklist')}</p>
            )}
          </div>
          {(role === 'Chef_chantier' || role === 'Chef_chantier') && (
            <Button variant="outline" className="w-full mt-8 border-slate-200 text-slate-500 hover:text-[var(--color-primary)] hover:bg-slate-50 font-bold" onClick={() => setIsNewChecklistModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> {t('control.create_checklist')}
            </Button>
          )}
        </Card>
      )}


      {/* Full History Modal */}
      <Modal
        isOpen={isFullHistoryModalOpen}
        onClose={() => setIsFullHistoryModalOpen(false)}
        title={t('control.incident_history')}
        size="xl"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par titre, lieu, déclarant..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
              <Button variant="outline" size="sm" className="h-10 px-4 font-bold">
                <Filter className="w-4 h-4 mr-2" />
                Filtres
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 font-bold"
              onClick={() => {
                const dataToExport = filteredIncidents
                  .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                  .map(i => ({
                    'ID': i.id,
                    'DATE': i.date ? new Date(i.date).toLocaleDateString('fr-FR') : 'N/A',
                    'TITRE': i.title,
                    'TYPE': i.type,
                    'CHANTIER': i.location,
                    'GRAVITÉ': i.gravity,
                    'STATUT': i.status,
                    'DÉCLARANT': i.reporter,
                    'DESCRIPTION': i.desc
                  }));
                exportToCSV(dataToExport, `historique_incidents_${new Date().toISOString().split('T')[0]}`);
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter (CSV)
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600">
                      Date <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600">
                      Incident <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600">
                      Chantier <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gravité</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                  <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredIncidents.map((incident, i) => (
                  <tr key={`incident-history-${incident.id}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-xs font-bold text-slate-500">{incident.date}</td>
                    <td className="p-4">
                      <p className="text-xs font-black text-slate-900">{incident.title}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{incident.type}</p>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-600">{incident.location}</td>
                    <td className="p-4">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                        incident.gravity === 'Critique' ? "bg-red-100 text-red-600" :
                          incident.gravity === 'Haute' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {incident.gravity}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-1 rounded-lg",
                        incident.status === 'Résolu' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      )}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedIncident(incident);
                          setIsFullHistoryModalOpen(false);
                        }}
                        className="p-2 text-slate-400 hover:text-[var(--color-primary)] transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredIncidents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">
                      Aucun incident trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <Button variant="outline" onClick={() => setIsFullHistoryModalOpen(false)} className="font-bold">{t('common.close')}</Button>
          </div>
        </div>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        isOpen={isStatusUpdateModalOpen}
        onClose={() => setIsStatusUpdateModalOpen(false)}
        title={t('control.update_status')}
        size="sm"
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('control.new_status')}</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option key="status-placeholder" value="">Sélectionner un statut...</option>
              <option value="En cours">En cours</option>
              <option value="Audit requis">Audit requis</option>
              <option value="En attente">En attente</option>
              <option value="Résolu">Résolu</option>
              <option value="Fermé">Fermé</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('control.comment_optional')}</label>
            <textarea
              value={statusUpdateComment}
              onChange={(e) => setStatusUpdateComment(e.target.value)}
              placeholder="Précisez les raisons du changement..."
              className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            ></textarea>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsStatusUpdateModalOpen(false)} className="font-bold">{t('common.cancel')}</Button>
            <Button
              className="font-bold shadow-lg shadow-blue-900/20"
              disabled={isUpdatingStatus || !newStatus}
              onClick={async () => {
                if (newStatus && selectedIncident) {
                  setIsUpdatingStatus(true);
                  try {
                    const updatedHistory = [
                      ...(selectedIncident.history || [{ date: selectedIncident.date, action: 'Incident déclaré', user: selectedIncident.reporter }]),
                      { date: new Date().toLocaleString('fr-FR'), action: `Statut mis à jour: ${newStatus}`, user: name || 'Utilisateur' }
                    ];

                    await updateIncident(selectedIncident.id, {
                      status: newStatus,
                      history: updatedHistory
                    });

                    addLog({
                      module: 'Contrôle',
                      action: `Mise à jour statut incident: ${selectedIncident.title} -> ${newStatus}`,
                      user: name || 'Utilisateur',
                      type: newStatus === 'Résolu' || newStatus === 'Fermé' ? 'success' : 'warning'
                    });

                    if (newStatus === 'Fermé') {
                      notify(`Incident "${selectedIncident.title}" fermé et archivé.`, 'info', '/control');
                    } else {
                      notify(`Statut de l'incident "${selectedIncident.title}" mis à jour: ${newStatus}`, 'info', '/control');
                    }

                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 3000);
                    setIsStatusUpdateModalOpen(false);
                    setSelectedIncident(null);
                  } catch (err) {
                    notify('Erreur lors de la mise à jour du statut', 'error');
                  } finally {
                    setIsUpdatingStatus(false);
                  }
                }
              }}
            >
              {isUpdatingStatus ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              Confirmer
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Checklist Modal */}
      <Modal
        isOpen={isNewChecklistModalOpen}
        onClose={() => setIsNewChecklistModalOpen(false)}
        title={t('control.new_checklist')}
        size="md"
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('control.checklist_title')}</label>
            <Input
              placeholder="Ex: Contrôle Fondations"
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('control.site_concerned')}</label>
            <select
              value={newChecklistProjectId}
              onChange={(e) => setNewChecklistProjectId(Number(e.target.value))}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">Points de Contrôle (Tâches)</label>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--color-primary)] h-8 font-bold"
                onClick={() => setNewChecklistTasks([...newChecklistTasks, ""])}
              >
                <Plus className="w-3 h-3 mr-1" /> Ajouter
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {newChecklistTasks.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Tâche ${index + 1}`}
                    value={task}
                    onChange={(e) => {
                      const updated = [...newChecklistTasks];
                      updated[index] = e.target.value;
                      setNewChecklistTasks(updated);
                    }}
                  />
                  {newChecklistTasks.length > 1 && (
                    <Button
                      variant="ghost"
                      className="text-red-500 h-11 w-11 p-0"
                      onClick={() => setNewChecklistTasks(newChecklistTasks.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsNewChecklistModalOpen(false)} className="font-bold">{t('common.cancel')}</Button>
            <Button
              className="font-bold shadow-lg shadow-blue-900/20"
              disabled={isCreatingChecklist || !newChecklistTitle.trim()}
              onClick={async () => {
                if (newChecklistTitle.trim() && newChecklistProjectId) {
                  setIsCreatingChecklist(true);
                  try {
                    const tasks = newChecklistTasks
                      .filter(t => t.trim() !== "")
                      .map((t, i) => ({ id: `${Date.now()}-${i}`, title: t, completed: false }));

                    await addChecklist({
                      title: newChecklistTitle,
                      category: 'Qualité',
                      projectId: newChecklistProjectId,
                      tasks,
                      active: true,
                      date: new Date().toISOString().split('T')[0]
                    });
                    notify(`Checklist "${newChecklistTitle}" créée pour ${getProjectNameById(newChecklistProjectId)}.`, 'success', '/control');
                    setNewChecklistTitle("");
                    setNewChecklistTasks([""]);
                    setIsNewChecklistModalOpen(false);
                  } catch (err) {
                    notify('Erreur lors de la création de la checklist', 'error');
                  } finally {
                    setIsCreatingChecklist(false);
                  }
                }
              }}
            >
              {isCreatingChecklist ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              Créer la Checklist
            </Button>
          </div>
        </div>
      </Modal>

      {/* Checklist Detail Modal */}
      <Modal
        isOpen={!!selectedChecklist}
        onClose={() => setSelectedChecklist(null)}
        title={t('control.modals.checklist_details', { title: selectedChecklist?.title })}
        size="md"
      >
        {(() => {
          const currentChecklist = checklists.find(c => c.id === selectedChecklist?.id);
          if (!currentChecklist) return null;

          return (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chantier</p>
                <p className="text-sm font-bold text-slate-900">{getProjectNameById(currentChecklist.projectId) || currentChecklist.chantier}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Points de Contrôle</h4>
                <div className="space-y-2">
                  {currentChecklist.tasks.map((task: any, taskIdx: number) => (
                    <div
                      key={task.id != null && task.id !== '' ? `task-${currentChecklist.id}-${task.id}` : `task-${currentChecklist.id}-${taskIdx}`}
                      className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-[var(--color-primary)] transition-all cursor-pointer"
                      onClick={() => toggleChecklistTask(currentChecklist.id, task.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                          task.completed ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-slate-300 bg-white"
                        )}>
                          {task.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={cn(
                          "text-xs font-bold transition-colors",
                          task.completed ? "text-slate-400 line-through" : "text-slate-700"
                        )}>{task.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button variant="outline" onClick={() => setSelectedChecklist(null)} className="font-bold">{t('common.close')}</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Edit Checklist Modal */}
      <Modal
        isOpen={isEditChecklistModalOpen}
        onClose={() => setIsEditChecklistModalOpen(false)}
        title={t('control.modals.edit_checklist')}
        size="sm"
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">{t('control.checklist_title')}</label>
            <Input
              placeholder="Ex: Contrôle Fondations"
              value={editChecklistTitle}
              onChange={(e) => setEditChecklistTitle(e.target.value)}
              required
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditChecklistModalOpen(false)} className="font-bold">{t('common.cancel')}</Button>
            <Button
              className="font-bold shadow-lg shadow-blue-900/20"
              disabled={isUpdatingChecklist || !editChecklistTitle.trim()}
              onClick={async () => {
                if (editChecklistTitle.trim() && editingChecklist) {
                  setIsUpdatingChecklist(true);
                  try {
                    await updateChecklist(editingChecklist.id, { title: editChecklistTitle });
                    notify(`Checklist "${editChecklistTitle}" mise à jour.`, 'success', '/control');
                    setIsEditChecklistModalOpen(false);
                    setEditingChecklist(null);
                  } catch (err) {
                    notify('Erreur lors de la mise à jour', 'error');
                  } finally {
                    setIsUpdatingChecklist(false);
                  }
                }
              }}
            >
              {isUpdatingChecklist ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : null}
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Audit Detail Modal */}
      <Modal
        isOpen={!!selectedAudit}
        onClose={() => setSelectedAudit(null)}
        title={t('control.audit_details')}
        size="md"
      >
        {selectedAudit && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-3xl border border-blue-100">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedAudit.title}</h3>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">{getProjectNameById(selectedAudit.projectId) || selectedAudit.chantier}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('control.planned_date')}</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><Calendar className="w-3 h-3 mr-2 text-slate-400" /> {selectedAudit.date}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('control.auditor')}</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><User className="w-3 h-3 mr-2 text-slate-400" /> {selectedAudit.auditor}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('control.details_observations')}</h4>
              <div className="space-y-2">
                {selectedAudit.location && (
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lieu / Zone</p>
                      <p className="text-xs font-bold text-slate-700">{selectedAudit.location}</p>
                    </div>
                  </div>
                )}
                {selectedAudit.observations && (
                  <div className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('control.observations')}</p>
                      <p className="text-xs font-bold text-slate-700 whitespace-pre-wrap">{selectedAudit.observations}</p>
                    </div>
                  </div>
                )}
                {selectedAudit.recommendations && (
                  <div className="flex items-start gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('control.recommendations')}</p>
                      <p className="text-xs font-bold text-slate-700 whitespace-pre-wrap">{selectedAudit.recommendations}</p>
                    </div>
                  </div>
                )}
                {selectedAudit.score !== undefined && selectedAudit.score !== null && (
                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0"></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('control.score')}</p>
                      <p className="text-xs font-bold text-slate-700">{selectedAudit.score} / 100</p>
                    </div>
                  </div>
                )}
                {!selectedAudit.location && !selectedAudit.observations && !selectedAudit.recommendations && (selectedAudit.score === undefined || selectedAudit.score === null) && (
                  <p className="text-xs text-slate-400 italic py-2">{t('control.no_extra_details')}</p>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedAudit(null)} className="font-bold">{t('common.close')}</Button>
              <Button className="font-bold shadow-lg shadow-blue-900/20">{t('control.launch_audit')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Incident Detail Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title={t('control.incident_details')}
        size="lg"
      >
        {selectedIncident && (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  selectedIncident.gravity === 'Critique' ? "bg-red-100 text-red-600" :
                    selectedIncident.gravity === 'Haute' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                )}>
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{selectedIncident.type}</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedIncident.title}</h3>
                </div>
              </div>
              <span className={cn(
                "text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg",
                selectedIncident.gravity === 'Critique' ? "bg-red-600 text-white" :
                  selectedIncident.gravity === 'Haute' ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
              )}>
                {selectedIncident.gravity}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Localisation</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><MapPin className="w-3 h-3 mr-2" /> {selectedIncident.location}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Déclaré par</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><User className="w-3 h-3 mr-2" /> {selectedIncident.reporter || t('common.modals.not_defined')}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('control.incident_date')}</p>
                <p className="text-sm font-bold text-slate-900 flex items-center"><Clock className="w-3 h-3 mr-2" /> {selectedIncident.date}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight border-b border-slate-100 pb-2">{t('control.facts')}</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{selectedIncident.desc}</p>
              {(selectedIncident.images?.length || selectedIncident.image) && (
                <div className="mt-4">
                  <ReportPhotos
                    images={
                      selectedIncident.images?.length
                        ? selectedIncident.images
                        : [selectedIncident.image]
                    }
                    reportId={selectedIncident.id}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight border-b border-slate-100 pb-2">{t('control.timeline')}</h4>
                <div className="space-y-3">
                  {(selectedIncident.history || [
                    { date: selectedIncident.date, action: 'Incident déclaré', user: selectedIncident.reporter }
                  ]).map((h: any, idx: number) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        idx === 0 ? "bg-red-500" : "bg-blue-500"
                      )}></div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{h.action}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{h.date} • {h.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedIncident(null)} className="font-bold">{t('common.close')}</Button>
              {(role === 'Chef_chantier' || role === 'Chef_chantier' || role === 'Chef_chantier') && (
                <Button className="font-bold shadow-lg shadow-blue-900/20" onClick={() => setIsStatusUpdateModalOpen(true)}>{t('control.update_status')}</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Incident Modal (Workflow) */}
      <Modal
        isOpen={isIncidentModalOpen}
        onClose={() => {
          setIsIncidentModalOpen(false);
          setIncidentStep(1);
          setIncidentImages([]);
          setIncidentFiles([]);
        }}
        title={t('control.declare_incident')}
        size="lg"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                incidentStep >= s ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleIncidentSubmit} className="space-y-8">
            {incidentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Nature de l'Incident</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Titre de l'Incident</label>
                    <Input
                      placeholder="Ex: Chute de pierre PK 45"
                      value={newIncident.title}
                      onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Type d'Incident</label>
                    <select
                      value={newIncident.type}
                      onChange={(e) => setNewIncident({ ...newIncident, type: e.target.value })}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option>Accident de travail</option>
                      <option>Presqu'accident (Near Miss)</option>
                      <option>Panne matériel critique (Engin)</option>
                      <option>Non-conformité technique (LABOGENIE)</option>
                      <option>Incident environnemental (Pollution)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Niveau de Gravité</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                      {['Faible', 'Moyen', 'Haut', 'Critique'].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setNewIncident({ ...newIncident, gravity: g })}
                          className={cn(
                            "py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                            newIncident.gravity === g
                              ? "bg-red-600 text-white border-red-600"
                              : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('control.site_concerned')}</label>
                    <select
                      value={newIncident.projectId || ''}
                      onChange={(e) => setNewIncident({ ...newIncident, projectId: Number(e.target.value) })}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      {!projects.length && (
                        <option value="">{t('control.no_site_available')}</option>
                      )}
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Description & Preuves</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('control.facts')}</label>
                    <textarea
                      value={newIncident.desc}
                      onChange={(e) => setNewIncident({ ...newIncident, desc: e.target.value })}
                      className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Décrivez précisément l'incident..."
                      required
                    ></textarea>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">
                      {t('control.photo_proof')} ({t('control.photos_optional_max')})
                    </label>
                    <input
                      id="incident-image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100 file:font-bold"
                      onChange={handleImagesChange}
                    />
                    {incidentImages.length === 0 ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => document.getElementById('incident-image-upload')?.click()}
                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('incident-image-upload')?.click()}
                        className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-red-500 hover:text-red-500 bg-slate-50/50 cursor-pointer transition-all"
                      >
                        <Camera className="w-10 h-10 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">{t('control.add_photos')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {incidentImages.map((src, i) => (
                          <div key={`incident-preview-${i}`} className="relative group flex items-center justify-center h-24 bg-slate-50 rounded-lg border border-slate-200">
                            <img src={src} alt="" className="max-w-full max-h-24 object-contain p-1" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full opacity-90"
                              onClick={() => removeIncidentPhoto(i)}
                              aria-label={t('common.delete')}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {incidentImages.length < 10 && (
                          <button
                            type="button"
                            onClick={() => document.getElementById('incident-image-upload')?.click()}
                            className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-red-500 hover:text-red-500"
                          >
                            <Camera className="w-5 h-5" />
                            <span className="text-[9px] font-bold mt-1">{t('control.add_photos')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {incidentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">{t('control.incident_sent_title')}</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">{t('control.incident_sent_desc')}</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => incidentStep > 1 ? setIncidentStep(1) : setIsIncidentModalOpen(false)} className="font-bold h-12 px-6">
                {incidentStep === 1 ? t('common.cancel') : t('common.modals.previous')}
              </Button>
              <Button variant="danger" type="submit" className="px-8 font-bold h-12 shadow-lg shadow-red-900/20" disabled={isSubmittingIncident}>
                {isSubmittingIncident ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('common.modals.processing')}
                  </>
                ) : (
                  incidentStep === 2 ? t('common.close') : t('control.send_report')
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Audit Modal (Workflow) */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title={t('control.audit_modal.title')}
        size="lg"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[1, 2].map((s) => (
              <div key={s} className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm z-10 transition-all",
                auditStep >= s ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
            ))}
          </div>

          <form onSubmit={handleAuditSubmit} className="space-y-8">
            {auditStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('control.audit_modal.control_settings')}</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('control.audit_modal.control_type')}</label>
                    <select
                      value={newAudit.type}
                      onChange={(e) => setNewAudit({ ...newAudit, type: e.target.value })}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {AUDIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('control.audit_modal.site')}</label>
                    <select
                      value={newAudit.projectId}
                      onChange={(e) => setNewAudit({ ...newAudit, projectId: Number(e.target.value) })}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label={t('control.audit_modal.auditor_with_controller')}
                    placeholder={t('control.audit_modal.responsible_name')}
                    required
                    value={newAudit.auditor}
                    onChange={(e) => setNewAudit({ ...newAudit, auditor: e.target.value })}
                  />
                </div>
                <Input
                  label={t('control.audit_modal.inspection_location')}
                  placeholder={t('control.audit_modal.location_example')}
                  value={newAudit.location}
                  onChange={(e) => setNewAudit({ ...newAudit, location: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{t('control.audit_modal.field_observations')}</label>
                    <textarea value={newAudit.observations} rows={3}
                      onChange={(e) => setNewAudit({ ...newAudit, observations: e.target.value })}
                      placeholder={t('control.audit_modal.observations_placeholder')}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{t('control.recommendations')}</label>
                    <textarea value={newAudit.recommendations} rows={3}
                      onChange={(e) => setNewAudit({ ...newAudit, recommendations: e.target.value })}
                      placeholder={t('control.audit_modal.corrective_actions')}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">{t('control.audit_modal.compliance_score')}</label>
                  <input type="number" min="0" max="100" value={newAudit.score}
                    onChange={(e) => setNewAudit({ ...newAudit, score: e.target.value })}
                    placeholder={t('control.audit_modal.score_example')}
                    className="w-32 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-slate-50" />
                  <span className="text-xs text-slate-400 ml-2">/ 100</span>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('control.audit_modal.planning')}</h4>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('control.planned_date')}</label>
                    <input
                      type="date"
                      value={newAudit.date}
                      onChange={(e) => setNewAudit({ ...newAudit, date: e.target.value })}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {auditStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 text-center py-8">
                <div className="w-20 h-20 bg-blue-50 text-[var(--color-primary)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 tracking-tight">{t('control.audit_modal.control_planned_recorded')}</h4>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">{t('control.audit_modal.audit_success_message')}</p>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="outline" type="button" onClick={() => auditStep > 1 ? setAuditStep(1) : setIsAuditModalOpen(false)} className="font-bold h-12 px-6">
                {auditStep === 1 ? t('control.audit_modal.cancel') : t('control.audit_modal.previous')}
              </Button>
              <Button className="px-8 font-bold h-12 shadow-lg shadow-blue-900/20" type="submit" disabled={isSubmittingAudit}>
                {isSubmittingAudit ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('control.audit_modal.processing')}
                  </>
                ) : (
                  auditStep === 2 ? t('control.audit_modal.finish') : (auditStep === 1 ? t('control.audit_modal.next') : t('control.audit_modal.save'))
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Toast Success */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-sm font-bold">Statut mis à jour avec succès !</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
