import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  MapPin,
  User,
  FileText,
  Banknote,
  Settings2,
  ChevronRight,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HardHat,
  ClipboardList,
  ClipboardCheck,
  Users,
  Handshake,
  Globe,
  DollarSign
} from 'lucide-react';
import { Card, Button, Input, Modal, cn } from '../../components/ui';
import { motion } from 'motion/react';

import { exportToCSV } from '../../lib/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { usePermissions } from '../../hooks/usePermissions';
import { useUser } from '../../context/UserContext';
import { useHistory } from '../../context/HistoryContext';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { projectService } from '../../services/project.service';
import { amendmentService } from '../../services/amendment.service';
import { approvalService } from '../../services/approval.service';
import { calculateTimeRemaining, formatDateAmendment, InfoItem } from './ProjectsComponents';
import { DEFAULT_BTP_TASKS } from '../../lib/defaultBtpTasks';
import { projectTaskService } from '../../services/projectTask.service';
import { filterProjectsForRole } from '../../lib/projectAccess';


export const ProjectsPage = () => {
    const { t } = useTranslation();
const today = new Date().toISOString().split('T')[0];
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = usePermissions();
  const { role, profile } = useUser();
  const canManageProjects = can('create_project') || can('modify_project');
  const canValidateReports = can('validate_reports');
  const projectDetailRoles = ['Chef_chantier', 'Directeur technique'];
  const canOpenProjectDetail = projectDetailRoles.includes(role || '');
  const openProjectDetail = (project: { id: number }) => {
    if (canOpenProjectDetail && project.id) {
      navigate(`/projects/${project.id}`);
    }
  };
  const userName = profile?.name;
  const { addLog } = useHistory();
  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    transactions,
    dailyReports,
    addDailyReport,
    employees,
    subcontracts,
    updateSubcontract,
    isDataSyncing,
  } = useData();
  const { notify } = useNotification();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Toutes les régions');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isGanttModalOpen, setIsGanttModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [ganttProject, setGanttProject] = useState<any>(null);
  const [isGanttEditMode, setIsGanttEditMode] = useState(false);

  const loadAmendments = async (projectId: number) => {
    setIsLoadingAmendments(true);
    try {
      const data = await amendmentService.getAll(projectId);
      setAmendments(data);
    } catch { setAmendments([]); }
    finally { setIsLoadingAmendments(false); }
  };

  
  const handleCreateAmendment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!newAmendment.justification.trim()) { notify(t('projects.notifications.justification_required'), 'error'); return; }
    setIsSubmittingAmendment(true);
    try {
      await amendmentService.create(editingProject.id, {
        ...newAmendment,
        ancienBudget: newAmendment.ancienBudget ? Number(newAmendment.ancienBudget) : undefined,
        nouveauBudget: newAmendment.nouveauBudget ? Number(newAmendment.nouveauBudget) : undefined
});
      notify(t('projects.notifications.amendment_created'), 'success');
      setIsAmendmentModalOpen(false);
      setNewAmendment({ type: 'Délai', justification: '', ancienneDate: '', nouvelleDate: '', ancienBudget: '', nouveauBudget: '' });
      loadAmendments(editingProject.id);
    } catch (err: any) { notify(err?.message || 'Erreur', 'error'); }
    finally { setIsSubmittingAmendment(false); }
  };

  const handleValidateAmendment = async (amendmentId: number, statut: 'Approuvé' | 'Rejeté') => {
    if (!editingProject) return;
    
    // Ajouter l'avenant en cours de validation
    setValidatingAmendments(prev => new Set(prev).add(amendmentId));
    
    try {
      const decision = statut === 'Approuvé' ? 'approve' : 'reject';
      await approvalService.decide('amendment', amendmentId, decision);
      window.dispatchEvent(new CustomEvent('van_btp:approvals_updated'));

      await loadAmendments(editingProject.id);
      
      // Mettre à jour les infos du projet si approuvé
      if (statut === 'Approuvé') {
        await updateProject(editingProject.id, {});
        notify(t('projects.notifications.amendment_approved'), 'success');
      } else {
        notify(t('projects.notifications.amendment_rejected'), 'warning');
      }
      
      // Indiquer que le DG a validé/rejeté un avenant
      setHasValidatedAmendment(true);
    } catch (err: any) {
      notify(err?.message || 'Erreur lors de la validation de l\'avenant', 'error');
    } finally {
      // Retirer l'avenant de l'état de chargement
      setValidatingAmendments(prev => {
        const newSet = new Set(prev);
        newSet.delete(amendmentId);
        return newSet;
      });
    }
  };
  const [isUpdatingGantt, setIsUpdatingGantt] = useState(false);
  const [isUpdatingGanttPanel, setIsUpdatingGanttPanel] = useState(false);
  const [isExportGanttModalOpen, setIsExportGanttModalOpen] = useState(false);
  const [isExportingGantt, setIsExportingGantt] = useState(false);
  const [isExportSuccess, setIsExportSuccess] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [amendments, setAmendments] = useState<any[]>([]);
  const [isAmendmentModalOpen, setIsAmendmentModalOpen] = useState(false);
  const [isLoadingAmendments, setIsLoadingAmendments] = useState(false);
  const [newAmendment, setNewAmendment] = useState({
    type: 'Délai' as 'Délai' | 'Budget' | 'Périmètre' | 'Autre',
    justification: '',
    ancienneDate: '',
    nouvelleDate: '',
    ancienBudget: '',
    nouveauBudget: ''
});
  const [isSubmittingAmendment, setIsSubmittingAmendment] = useState(false);
  const [validatingAmendments, setValidatingAmendments] = useState<Set<number>>(new Set());
  const [editTaskTitles, setEditTaskTitles] = useState<string[]>([...DEFAULT_BTP_TASKS]);
  const [hasValidatedAmendment, setHasValidatedAmendment] = useState(false);

  const [newProject, setNewProject] = useState({
    name: '',
    code: '',
    client: '',
    region: 'Littoral',
    location: '',
    budget: '',
    air: '2.2% (Régime Réel)',
    guarantee: '10',
    bank: '',
    manager: '',
    startDate: '',
    duration: '12',
    status: '',
    category: 'Bâtiment' as 'Bâtiment' | 'Voirie' | 'Autre',
    subCategory: '' as string
});

  const regions = [
    'Toutes les régions',
    'Littoral',
    'Centre',
    'Sud',
    'Ouest',
    'Est',
    'Nord',
    'Extrême-Nord',
    'Adamaoua',
    'Nord-Ouest',
    'Sud-Ouest'
  ];

  const regionCities: Record<string, string[]> = {
    'Littoral': ['Douala', 'Edéa', 'Nkongsamba', 'Yabassi', 'Mouanko', 'Loum', 'Mbanga'],
    'Centre': ['Yaoundé', 'Mbalmayo', 'Obala', 'Bafia', 'Nan-Eboko', 'Eseka', 'Akonolinga'],
    'Sud': ['Ebolowa', 'Kribi', 'Sangmélima', 'Ambam', 'Kyé-Ossi', 'Lolodorf'],
    'Ouest': ['Bafoussam', 'Dschang', 'Foumban', 'Bafang', 'Mbouda', 'Baham', 'Bangangté'],
    'Est': ['Bertoua', 'Batouri', 'Abong-Mbang', 'Yokadouma', 'Garoua-Boulaï', 'Belabo'],
    'Nord': ['Garoua', 'Guider', 'Figuil', 'Poli', 'Rey-Bouba', 'Lagdo'],
    'Extrême-Nord': ['Maroua', 'Yagoua', 'Kousseri', 'Mokolo', 'Mora', 'Kaélé'],
    'Adamaoua': ['Ngaoundéré', 'Meiganga', 'Tibati', 'Banyo', 'Tignère'],
    'Nord-Ouest': ['Bamenda', 'Kumbo', 'Wum', 'Nkambe', 'Fundong', 'Bali'],
    'Sud-Ouest': ['Buea', 'Limbe', 'Kumba', 'Mamfe', 'Tiko', 'Muyuka', 'Bangem']
  };

  const visibleProjects = useMemo(
    () => filterProjectsForRole(projects, role, profile?.id),
    [projects, role, profile?.id],
  );

  const filteredProjects = visibleProjects.filter(project => {
    const matchesSearch =
      (project.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (project.client?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (project.code?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

    const matchesRegion = selectedRegion === 'Toutes les régions' || project.region === selectedRegion;

    return matchesSearch && matchesRegion;
  });


  // Suppression de mapFrontendStatusToBackend au profit de la conservation des statuts détaillés

  // Charger les informations existantes du projet selon le type d'avenant
  const handleAmendmentTypeChange = (type: string) => {
    if (!editingProject) return;
    
    setNewAmendment(p => ({ 
      ...p, 
      type: type as any,
      // Réinitialiser les champs selon le type
      ancienneDate: type === 'Délai' ? editingProject.end || editingProject.endDate || '' : '',
      nouvelleDate: '',
      ancienBudget: type === 'Budget' ? String(editingProject.budget || 0) : '',
      nouveauBudget: ''
    }));
  };


  // Ouvrir la modale d'édition si redirection depuis la page détail
  useEffect(() => {
    const editId = (location.state as { editProjectId?: number } | null)?.editProjectId;
    if (!editId) return;
    const p = projects.find((proj) => proj.id === editId);
    if (p) {
      setEditingProject(p);
      setIsEditProjectModalOpen(true);
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, projects, navigate, location.pathname]);

  useEffect(() => {
    if (isAmendmentModalOpen) {
      setHasValidatedAmendment(false);
    }
  }, [isAmendmentModalOpen]);

  useEffect(() => {
    if (!isEditProjectModalOpen || !editingProject?.id) {
      setEditTaskTitles([...DEFAULT_BTP_TASKS]);
      return;
    }
    projectTaskService.getAll(editingProject.id).then((tasks) => {
      const titles = [...tasks]
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((task) => task.title);
      setEditTaskTitles(titles.length ? titles : [...DEFAULT_BTP_TASKS]);
    }).catch(() => setEditTaskTitles([...DEFAULT_BTP_TASKS]));
  }, [isEditProjectModalOpen, editingProject?.id]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addStep < 4) {
      setAddStep(addStep + 1);
      return;
    }

    setIsCreatingProject(true);
    try {
      const startDate = newProject.startDate || new Date().toISOString().split('T')[0];
      const durationMonths = parseInt(newProject.duration || '12', 10);
      const computedEndDate = new Date(startDate);
      computedEndDate.setMonth(computedEndDate.getMonth() + durationMonths);

      const payload = {
        code: newProject.code || `CH-${Date.now()}`,
        name: newProject.name || '',
        client: newProject.client || '',
        budget: Number(newProject.budget || 0),
        location: newProject.location || '',
        region: newProject.region || '',
        startDate,
        endDate: computedEndDate.toISOString().split('T')[0],
        status: newProject.status || '',
        category: newProject.category || 'Autre',
        subCategory: (newProject.subCategory && newProject.subCategory !== '') ? newProject.subCategory : undefined,
        manager: newProject.manager || '',
        airRate: newProject.air || null,
        guaranteeRetention: newProject.guarantee || null,
        guaranteeBank: newProject.bank || null,
      };

      const createdProject = await projectService.create(payload as any);

      addProject({
        id: createdProject.id,
        code: createdProject.code,
        name: createdProject.name,
        client: createdProject.client,
        status: createdProject.status,
        budget: Number(createdProject.budget),
        progress: createdProject.progress || 0,
        location: createdProject.location || '',
        region: createdProject.region || '',
        manager: createdProject.manager || '',
        category: createdProject.category || 'Autre',
        subCategory: createdProject.subCategory || '',
        start: createdProject.startDate || '',
        end: createdProject.endDate || '',
        startDate: createdProject.startDate || '',
        endDate: createdProject.endDate || '',
        airRate: createdProject.airRate || '',
        guaranteeRetention: createdProject.guaranteeRetention || '',
        guaranteeBank: createdProject.guaranteeBank || '',
      } as any);

      addLog({
        module: 'Projets',
        action: `Création du chantier: ${createdProject.name}`,
        user: userName || 'Utilisateur',
        type: 'success'
      });

      notify(t('projects.notifications.project_created', { name: createdProject.name }), 'success', '/projects');

      setIsAddModalOpen(false);
      setAddStep(1);
      setNewProject({
        name: '',
        code: '',
        client: '',
        region: 'Littoral',
        location: '',
        budget: '',
        air: '2.2% (Régime Réel)',
        guarantee: '10',
        bank: '',
        manager: '',
        startDate: '',
        duration: '12',
        status: '',
        category: 'Bâtiment',
        subCategory: ''
      });
    } catch (err: any) {
      notify(err.message || 'Erreur lors de la création du chantier', 'error');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsDeletingProject(true);
    try {
      await projectService.remove(projectToDelete.id);
      deleteProject(projectToDelete.id);
      
      // Forcer le rafraîchissement des données depuis le backend
      setTimeout(() => {
        window.location.reload();
      }, 500);

      addLog({
        module: 'Projets',
        action: `Suppression du chantier: ${projectToDelete.name}`,
        user: userName || 'Utilisateur',
        type: 'warning'
      });

      notify(t('projects.notifications.project_deleted', { name: projectToDelete.name }), 'success', '/projects');
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    } catch (err: any) {
      notify(err.message || 'Erreur lors de la suppression du chantier', 'error');
    } finally {
      setIsDeletingProject(false);
    }
  };
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm uppercase tracking-widest mb-2">
            <HardHat className="w-4 h-4" />
            <span>{t('projects.execution')}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{t('projects.title')}</h1>
          <p className="text-slate-500 font-medium mt-1">{t('projects.digitalization_desc')}</p>
        </div>
        {canManageProjects && (
          <Button onClick={() => setIsAddModalOpen(true)} className="shadow-lg shadow-blue-900/20 h-12 px-6 font-bold">
            <Plus className="w-5 h-5 mr-2" />
            {t('projects.create_project')}
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      {/* ... */}

      {/* Project Grid/List */}
      {isDataSyncing ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="animate-spin h-10 w-10 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
          <p className="text-sm font-bold text-slate-500">{t('projects.loading_sites')}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProjects.map((project, idx) => (
            <motion.div
              key={project.id || project.code || `idx-${idx}-${Math.random()}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className="group cursor-pointer"
              onClick={() => openProjectDetail(project)}
            >
              <Card className="h-full border-none shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 overflow-hidden flex flex-col">
                <div className="h-2 bg-[var(--color-primary)] w-full"></div>
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{project.code}</span>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider max-w-[180px] truncate",
                        (project.progress ?? 0) >= 100 ? "bg-emerald-500 text-white" :
                        (project.progress ?? 0) >= 50 ? "bg-blue-600 text-white" :
                        (project.progress ?? 0) > 0 ? "bg-amber-500 text-white" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 mr-1.5 animate-pulse shrink-0" />
                        {project.status || t('projects.wizard.advancement_start')}
                      </span>
                    </div>
                    {canManageProjects && (
                      <div className="relative">
                        <button 
                          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            const dropdown = e.currentTarget.nextElementSibling;
                            if (dropdown) {
                              dropdown.classList.toggle('opacity-100');
                              dropdown.classList.toggle('visible');
                            }
                          }}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <div className="menu-dropdown absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 z-50 opacity-0 invisible transition-all">
                          <button
                            onClick={() => {
                              setEditingProject(project);
                              setIsEditProjectModalOpen(true);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Settings2 className="w-4 h-4" />
                            {t('projects.modify_info')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(project);
                              setIsDeleteModalOpen(true);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            {t('projects.delete_project')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-[var(--color-primary)] transition-colors tracking-tight leading-tight">
                    {project.name}
                  </h3>

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center text-sm text-slate-600 font-medium">
                      <Building2 className="w-4 h-4 mr-2 text-slate-400" />
                      {project.client}
                    </div>
                    <div className="flex items-center text-sm text-slate-600 font-medium">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                      {project.location}
                    </div>
                    <div className="flex items-center text-sm text-slate-600 font-medium">
                      <User className="w-4 h-4 mr-2 text-slate-400" />
                      {project.manager}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>{t('projects.physical_progress')}</span>
                      <span className="text-slate-900">{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-[var(--color-primary)] rounded-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs font-bold text-slate-600 hover:text-[var(--color-primary)] hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      openProjectDetail(project);
                    }}
                  >
                    {t('projects.market_details')}
                  </Button>
                  {canManageProjects && (
                    <>
                      <div className="w-px h-4 bg-slate-200"></div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs font-bold text-slate-600 hover:text-[var(--color-primary)] hover:bg-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                          setIsEditProjectModalOpen(true);
                        }}
                      >
                        {t('projects.modify')}
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">{t('projects.table.site')}</th>
                <th className="px-6 py-4">{t('projects.table.client')}</th>
                <th className="px-6 py-4">{t('projects.table.location')}</th>
                <th className="px-6 py-4">{t('projects.table.progress')}</th>
                <th className="px-6 py-4">{t('projects.table.status')}</th>
                <th className="px-6 py-4 text-right">{t('projects.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProjects.map((project, idx) => (
                <tr key={project.id || project.code || `tr-${idx}-${Math.random()}`} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                        <HardHat className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm">{project.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{project.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{project.client}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600">{project.location}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary)] rounded-full" style={{ width: `${project.progress}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-900">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg",
                      project.status === 'clôture' ? "bg-emerald-100 text-emerald-700" :
                        project.status === 'exécution' ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                    )}>{project.status || t('projects.wizard.advancement_start')}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProjectDetail(project);
                        }}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      {canManageProjects && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                            setIsEditProjectModalOpen(true);
                          }}
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Project Modal (Wizard) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('projects.modals.market_open')}
        size="lg"
      >
        <div className="space-y-8">
          {/* Stepper */}
          <div className="flex items-center justify-between px-12 relative">
            <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            {[
              { step: 1, label: t('projects.wizard.step_admin') },
              { step: 2, label: t('projects.wizard.step_finances') },
              { step: 3, label: t('projects.wizard.step_tech') },
              { step: 4, label: t('projects.wizard.step_summary') }
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-2 z-10">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all",
                  addStep >= s.step ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-900/20" : "bg-white border-2 border-slate-100 text-slate-300"
                )}>
                  {s.step}
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest", addStep >= s.step ? "text-slate-900" : "text-slate-300")}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateProject} className="space-y-6">
            {addStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('projects.wizard.admin_title')}</h4>
                <Input
                  label={t('projects.wizard.market_label')}
                  placeholder={t('projects.wizard.market_placeholder')}
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('projects.wizard.market_number')}
                    placeholder={t('projects.wizard.market_number_placeholder')}
                    required
                    value={newProject.code}
                    onChange={(e) => setNewProject({ ...newProject, code: e.target.value })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('projects.wizard.client_label')}</label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      placeholder={t('projects.wizard.client_placeholder')}
                      value={newProject.client}
                      onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('projects.wizard.region')}</label>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newProject.region}
                      onChange={(e) => setNewProject({ ...newProject, region: e.target.value })}
                    >
                      {regions.filter(r => r !== 'Toutes les régions').map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  {/* Catégorie du chantier */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{t('projects.wizard.category')}</label>
                    <div className="flex flex-col gap-2">
                      <select
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        value={(newProject.category === 'Bâtiment' || newProject.category === 'Voirie') ? newProject.category : 'Autre'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Autre') {
                            setNewProject({ ...newProject, category: 'Autre', subCategory: '' });
                          } else {
                            setNewProject({ ...newProject, category: val as any, subCategory: '' });
                          }
                        }}
                      >
                        <option value="Bâtiment">{t('projects.category.building') || 'Bâtiment'}</option>
                        <option value="Voirie">{t('projects.category.road') || 'Voirie'}</option>
                        <option value="Autre">{t('projects.wizard.category_other')}</option>
                      </select>

                      {((newProject.category !== 'Bâtiment' && newProject.category !== 'Voirie') || newProject.category === 'Autre') && (
                        <input
                          type="text"
                          className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] animate-in fade-in slide-in-from-top-1 duration-200"
                          placeholder={t('projects.wizard.category_placeholder')}
                          value={newProject.category === 'Autre' ? '' : newProject.category}
                          onChange={(e) => setNewProject({ ...newProject, category: e.target.value as any })}
                          required
                        />
                      )}
                    </div>
                  </div>
                  {newProject.category === 'Bâtiment' && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">{t('projects.wizard.subcategory')}</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(['Gros œuvre', 'Second œuvre'] as const).map(sub => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setNewProject({ ...newProject, subCategory: sub })}
                            className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${newProject.subCategory === sub ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                          >
                            {sub === 'Gros œuvre' ? t('projects.wizard.gros_oeuvre') : t('projects.wizard.second_oeuvre')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('projects.wizard.location')}</label>
                    <div className="flex flex-col gap-2">
                      <select
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        value={regionCities[newProject.region]?.includes(newProject.location) ? newProject.location : (newProject.location ? 'Autre' : '')}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'Autre') {
                            setNewProject({ ...newProject, location: '' });
                          } else {
                            setNewProject({ ...newProject, location: val });
                          }
                        }}
                        required
                      >
                        <option key="city-placeholder" value="">{t('projects.wizard.city_placeholder')}</option>
                        {(regionCities[newProject.region] || []).map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                        <option value="Autre">{t('projects.wizard.location_manual')}</option>
                      </select>
                      
                      {(!regionCities[newProject.region]?.includes(newProject.location) || newProject.location === '') && (
                        <input
                          type="text"
                          className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] animate-in fade-in slide-in-from-top-1 duration-200"
                          placeholder={t('projects.wizard.location_manual_placeholder')}
                          value={newProject.location}
                          onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                          required
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {addStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('projects.wizard.finances_title')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('projects.wizard.amount_ttc')}</label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                        placeholder="0"
                        value={newProject.budget}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value >= 0) {
                            setNewProject({ ...newProject, budget: value });
                          }
                        }}
                        min="0"
                        step="1"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('projects.wizard.air_rate')}</label>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newProject.air}
                      onChange={(e) => setNewProject({ ...newProject, air: e.target.value })}
                    >
                      <option>2.2% (Régime Réel)</option>
                      <option>5.5% (Régime Simplifié)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">{t('projects.wizard.advancement_state')}</label>
                    <select
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={newProject.status}
                      onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}
                    >
                      <option value="">{t('projects.wizard.advancement_start')}</option>
                      {DEFAULT_BTP_TASKS.map((title) => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Input
                    label={t('projects.wizard.guarantee_retention')}
                    type="number"
                    min="0" max="100"
                    placeholder="10"
                    value={newProject.guarantee}
                    onChange={(e) => setNewProject({ ...newProject, guarantee: e.target.value })}
                  />
                <Input
                  label={t('projects.wizard.guarantee_bank')}
                  placeholder={t('projects.wizard.guarantee_bank_placeholder')}
                  value={newProject.bank}
                  onChange={(e) => setNewProject({ ...newProject, bank: e.target.value })}
                />
              </div>
            )}

            {addStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('projects.wizard.tech_title')}</h4>
                <Input
                  label={t('projects.wizard.manager')}
                  placeholder={t('projects.wizard.manager_placeholder')}
                  required
                  value={newProject.manager}
                  onChange={(e) => setNewProject({ ...newProject, manager: e.target.value })}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('projects.wizard.os_date')}
                    type="date" min={today}
                    required
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                  />
                  <Input
                    label={t('projects.wizard.contractual_duration')}
                    type="number"
                    min="1"
                    placeholder="12"
                    required
                    value={newProject.duration}
                    onChange={(e) => setNewProject({ ...newProject, duration: e.target.value })}
                  />
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {t('projects.wizard.tech_note')}
                  </p>
                </div>
              </div>
            )}

            {addStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{t('projects.wizard.summary_title')}</h4>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t('projects.wizard.market_label')}</p>
                      <p className="text-sm font-black text-slate-900">{newProject.name || t('common.not_specified')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t('projects.wizard.client_label')}</p>
                      <p className="text-sm font-black text-slate-900">{newProject.client}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t('projects.wizard.amount_ttc')}</p>
                      <p className="text-sm font-black text-slate-900">{newProject.budget ? `${parseInt(newProject.budget).toLocaleString()} FCFA` : '0 FCFA'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t('projects.wizard.contractual_duration')}</p>
                      <p className="text-sm font-black text-slate-900">{newProject.duration} {t('common.months')}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('projects.wizard.summary_ready')}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-between">
              <Button variant="ghost" type="button" onClick={() => addStep > 1 ? setAddStep(addStep - 1) : setIsAddModalOpen(false)}>
                {addStep === 1 ? t('common.cancel') : t('common.back')}
              </Button>
              <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20" disabled={isCreatingProject}>
                {isCreatingProject ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('common.modals.processing')}
                  </>
                ) : (
                  addStep === 4 ? t('projects.create_project') : t('common.next')
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

        {/* Edit Project Modal */}
        {isEditProjectModalOpen && (
          <Modal
            isOpen={isEditProjectModalOpen}
            onClose={() => setIsEditProjectModalOpen(false)}
            title={t('projects.modals.edit_project', { name: editingProject?.name })}
            size="lg"
          >
            <form
              className="space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                setIsUpdatingProject(true);
                const formData = new FormData(e.currentTarget);
                const newStatus = formData.get('status') as string;
                const updates: any = {
                  name: formData.get('name') as string,
                  code: formData.get('code') as string,
                  client: formData.get('client') as string,
                  manager: formData.get('manager') as string,
                  status: newStatus,
                  budget: formData.get('budget') as string,
                  location: formData.get('location') as string,
                  region: formData.get('region') as string,
                  startDate: formData.get('start') as string,
                  endDate: formData.get('end') as string
                };
                try {
                  await updateProject(editingProject!.id, updates);
                  addLog({
                    action: "Modification chantier",
                    user: userName || "Utilisateur",
                    details: `Chantier ${updates.name} mis à jour`,
                    type: "info"
                  });
                  notify(t('projects.notifications.project_updated', { name: updates.name }), 'success', '/projects');
                  setIsEditProjectModalOpen(false);
                } catch (err: any) {
                  notify(err?.message || 'Erreur lors de la mise à jour', 'error', '/projects');
                } finally {
                  setIsUpdatingProject(false);
                }
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={t('projects.wizard.market_label')} name="name" defaultValue={editingProject?.name} required />
                <Input label={t('projects.wizard.market_number')} name="code" defaultValue={editingProject?.code} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={t('projects.wizard.client_label')} name="client" defaultValue={editingProject?.client} required />
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{t('projects.wizard.advancement_state')}</label>
                  <select
                    name="status"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    defaultValue={editingProject?.status || ''}
                  >
                    <option value="">{t('projects.wizard.advancement_start')}</option>
                    {editTaskTitles.map((title) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={t('projects.wizard.amount_ttc')} name="budget" defaultValue={editingProject?.budget} required />
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{t('projects.wizard.region')}</label>
                  <select
                    name="region"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    value={editingProject?.region}
                    onChange={(e) => setEditingProject({ ...editingProject, region: e.target.value })}
                  >
                    {regions.filter(r => r !== 'Toutes les régions').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">{t('projects.wizard.category')}</label>
                  <div className="flex flex-col gap-2">
                    <select
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={(editingProject?.category === 'Bâtiment' || editingProject?.category === 'Voirie') ? editingProject?.category : 'Autre'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Autre') {
                          setEditingProject({ ...editingProject, category: 'Autre' });
                        } else {
                          setEditingProject({ ...editingProject, category: val });
                        }
                      }}
                    >
                      <option value="Bâtiment">{t('projects.category.building')}</option>
                      <option value="Voirie">{t('projects.category.road')}</option>
                      <option value="Autre">{t('projects.wizard.category_other')}</option>
                    </select>

                    {((editingProject?.category !== 'Bâtiment' && editingProject?.category !== 'Voirie') || editingProject?.category === 'Autre') && (
                      <input
                        name="category"
                        type="text"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] animate-in fade-in slide-in-from-top-1 duration-200"
                        placeholder={t('projects.wizard.category_placeholder')}
                        value={editingProject?.category === 'Autre' ? '' : editingProject?.category}
                        onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                        required
                      />
                    )}
                    {/* Hidden input to ensure 'category' is sent in FormData if select is used */}
                    {(editingProject?.category === 'Bâtiment' || editingProject?.category === 'Voirie') && (
                      <input type="hidden" name="category" value={editingProject?.category} />
                    )}
                  </div>
                </div>
                {editingProject?.category === 'Bâtiment' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">{t('projects.wizard.subcategory')}</label>
                    <select
                      name="subCategory"
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={editingProject?.subCategory || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, subCategory: e.target.value })}
                    >
                      <option key="select-placeholder" value="">{t('common.select_placeholder')}</option>
                      <option value="Gros œuvre">{t('projects.wizard.gros_oeuvre')}</option>
                      <option value="Second œuvre">{t('projects.wizard.second_oeuvre')}</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={t('projects.wizard.manager')} name="manager" defaultValue={editingProject?.manager} />
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">{t('projects.wizard.location')}</label>
                  <div className="flex flex-col gap-2">
                    <select
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      value={regionCities[editingProject?.region]?.includes(editingProject?.location) ? editingProject?.location : (editingProject?.location ? 'Autre' : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Autre') {
                          setEditingProject({ ...editingProject, location: '' });
                        } else {
                          setEditingProject({ ...editingProject, location: val });
                        }
                      }}
                      required
                    >
                      <option key="city-placeholder-edit" value="">{t('projects.wizard.city_placeholder')}</option>
                      {(regionCities[editingProject?.region] || []).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                      <option value="Autre">{t('projects.wizard.location_manual')}</option>
                    </select>
                    
                    {(!regionCities[editingProject?.region]?.includes(editingProject?.location) || editingProject?.location === '') && (
                      <input
                        name="location"
                        type="text"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] animate-in fade-in slide-in-from-top-1 duration-200"
                        placeholder={t('projects.wizard.location_manual_placeholder')}
                        value={editingProject?.location || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, location: e.target.value })}
                        required
                      />
                    )}
                    {/* Hidden input to ensure 'location' is sent in FormData if select is used */}
                    {regionCities[editingProject?.region]?.includes(editingProject?.location) && (
                      <input type="hidden" name="location" value={editingProject?.location} />
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label={t('projects.wizard.start_date')} name="start" type="date" min={today} defaultValue={editingProject?.start} required />
                <Input label={t('projects.details.contractual_end_date')} name="end" type="date" min={today} defaultValue={editingProject?.end} required />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsEditProjectModalOpen(false)}>{t('common.cancel')}</Button>
                <Button variant="outline" type="button"
                  onClick={() => { loadAmendments(editingProject!.id); setIsAmendmentModalOpen(true); }}
                  className="font-bold border-amber-300 text-amber-700 hover:bg-amber-50 gap-1">
                   {t('projects.modals.amendments', { name: '' }).split(' —')[0]} {amendments.length > 0 && `(${amendments.length})`}
                </Button>
                <Button type="submit" className="px-8 font-bold shadow-lg shadow-blue-900/20" disabled={isUpdatingProject}>
                  {isUpdatingProject ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('common.modals.processing')}
                    </>
                  ) : (
                    t('common.save')
                  )}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal Avenants */}
        {isAmendmentModalOpen && editingProject && (
          <Modal isOpen={isAmendmentModalOpen} onClose={() => setIsAmendmentModalOpen(false)}
            title={t('projects.modals.amendments', { name: editingProject.name })} size="lg">
            <div className="space-y-6">
              {/* Historique */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-slate-900">{t('projects.details.reports.history')}</h3>
                  <span className="text-sm text-slate-500">{amendments.length} {t('projects.modals.amendments', { name: '' }).split(' —')[0].toLowerCase()}(s)</span>
                </div>
                {isLoadingAmendments ? (
                  <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" /></div>
                ) : amendments.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-500">{t('projects.details.reports.no_reports')}</div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {amendments.map((a: any) => (
                      <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">{t(`projects.pdf.${a.type.toLowerCase()}` as any) || a.type}</span>
                            <p className="text-sm font-medium text-slate-700 mt-1">{a.justification}</p>
                            {a.type === 'Délai' && a.ancienneDate && a.nouvelleDate && (
                              <p className="text-xs text-slate-500 mt-1"> {formatDateAmendment(a.ancienneDate)} &rarr; <span className="font-bold text-[var(--color-primary)]">{formatDateAmendment(a.nouvelleDate)}</span></p>
                            )}
                            {a.type === 'Budget' && a.ancienBudget && a.nouveauBudget && (
                              <p className="text-xs text-slate-500 mt-1"> {Number(a.ancienBudget).toLocaleString()} &rarr; <span className="font-bold text-[var(--color-primary)]">{Number(a.nouveauBudget).toLocaleString()} FCFA</span></p>
                            )}
                            
                            {/* Validation avenant — directeur technique */}
                            {canValidateReports && role === 'Directeur technique' && a.statut === 'En attente' && (
                              <div className="flex gap-2 mt-3">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleValidateAmendment(a.id, 'Approuvé')}
                                  className="text-xs px-3 py-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  isLoading={validatingAmendments.has(a.id)}
                                  disabled={validatingAmendments.has(a.id)}
                                >
                                  ✓ {t('common.modals.confirm')}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleValidateAmendment(a.id, 'Rejeté')}
                                  className="text-xs px-3 py-1 border-red-300 text-red-700 hover:bg-red-50"
                                  isLoading={validatingAmendments.has(a.id)}
                                  disabled={validatingAmendments.has(a.id)}
                                >
                                  ✗ {t('common.modals.cancel')}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <span className={`text-xs font-black px-2 py-1 rounded-full whitespace-nowrap ${a.statut === 'Approuvé' ? 'bg-emerald-100 text-emerald-700' : a.statut === 'Rejeté' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {a.statut === 'Approuvé' ? t('finances.status.validated') : a.statut === 'Rejeté' ? t('finances.status.rejected') : t('finances.status.pending')}
                            </span>
                            {a.statut === 'En attente' && role === 'Directeur technique' && (
                              <span className="text-xs text-amber-600 font-medium">{t('finances.status.pending')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulaire nouvel avenant */}
              {canManageProjects && (
                <div className="border-t border-slate-100 pt-6">
                  <h3 className="font-black text-slate-900 mb-4">Nouvel avenant</h3>
                  <form onSubmit={handleCreateAmendment} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">Type de modification</label>
                        <select value={newAmendment.type} onChange={e => handleAmendmentTypeChange(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white font-medium">
                          <option value="Délai"> Modification de délai</option>
                          <option value="Budget"> Modification de budget</option>
                          <option value="Périmètre"> Modification de périmètre</option>
                          <option value="Autre"> Autre</option>
                        </select>
                      </div>
                    </div>
                    {newAmendment.type === 'Délai' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Ancienne date de fin" type="date" min={today} value={newAmendment.ancienneDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAmendment(p => ({ ...p, ancienneDate: e.target.value }))} 
                          readonly className="bg-slate-100 cursor-not-allowed" />
                        <Input label="Nouvelle date de fin" type="date" min={today} value={newAmendment.nouvelleDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAmendment(p => ({ ...p, nouvelleDate: e.target.value }))} />
                      </div>
                    )}
                    {newAmendment.type === 'Budget' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Budget initial (FCFA)" type="number" min="0" value={newAmendment.ancienBudget}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAmendment(p => ({ ...p, ancienBudget: e.target.value }))} 
                          readonly className="bg-slate-100 cursor-not-allowed" />
                        <Input label="Nouveau budget (FCFA)" type="number" min="0" value={newAmendment.nouveauBudget}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAmendment(p => ({ ...p, nouveauBudget: e.target.value }))} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">{t('projects.amendments.justification')} <span className="text-red-500">*</span></label>
                      <textarea value={newAmendment.justification} required
                        onChange={e => setNewAmendment(p => ({ ...p, justification: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        placeholder={t('projects.amendments.justification_placeholder')}/>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                      <Button variant="outline" type="button" onClick={() => setIsAmendmentModalOpen(false)}>{t('common.close')}</Button>
                      <Button type="submit" className="font-bold shadow-lg shadow-blue-900/20" disabled={isSubmittingAmendment}>
                        {isSubmittingAmendment ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            {t('common.modals.processing')}
                          </>
                        ) : (
                          t('common.send')
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Gantt Modal */}
        {isGanttModalOpen && (
          <Modal
            isOpen={isGanttModalOpen}
            onClose={() => setIsGanttModalOpen(false)}
            title={t('projects.modals.gantt', { name: ganttProject?.name })}
            size="xl"
          >
            <div className="space-y-8">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900">Calendrier d'Exécution</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Période: {ganttProject?.start} au {ganttProject?.end}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="font-bold" onClick={() => setIsExportGanttModalOpen(true)}>
                    Exporter MS Project
                  </Button>
                  <Button
                    variant={isGanttEditMode ? "primary" : "outline"}
                    size="sm"
                    className="font-bold"
                    onClick={() => {
                      if (isGanttEditMode) {
                        setIsUpdatingGantt(true);
                        setTimeout(() => {
                          setIsUpdatingGantt(false);
                          setIsGanttEditMode(false);
                          // planning updated
                        }, 1000);
                      } else {
                        setIsGanttEditMode(true);
                      }
                    }}
                    disabled={isUpdatingGantt}
                  >
                    {isUpdatingGantt ? "Mise à jour..." : isGanttEditMode ? "Mettre à jour le Planning" : "Éditer le Planning"}
                  </Button>
                  <Button variant="outline" size="sm" className="font-bold" onClick={() => setIsAddTaskModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une Tâche
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                <div className="min-w-[800px] p-6 space-y-6">
                  {/* Gantt Header */}
                  <div className="grid grid-cols-12 gap-4 border-b border-slate-100 pb-4">
                    <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tâche / Activité</div>
                    <div className="col-span-9 grid grid-cols-6 gap-2">
                      {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'].map(m => (
                        <div key={m} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{m}</div>
                      ))}
                    </div>
                  </div>

                  {/* Gantt Rows */}
                  {[
                    { task: 'Terrassement & Fouilles', start: 0, duration: 2, progress: 100, color: 'bg-blue-500' },
                    { task: 'Ouvrages d\'Art (Dalots)', start: 1, duration: 3, progress: 60, color: 'bg-emerald-500' },
                    { task: 'Couche de Fondation', start: 3, duration: 2, progress: 20, color: 'bg-amber-500' },
                    { task: 'Bitumage (BB)', start: 5, duration: 1, progress: 0, color: 'bg-slate-500' },
                  ].map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <p className="text-sm font-black text-slate-900">{item.task}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.progress}% complété</p>
                      </div>
                      <div className="col-span-9 grid grid-cols-6 gap-2 relative h-8 bg-slate-50 rounded-lg overflow-hidden">
                        <div
                          className={cn(
                            "absolute top-1 bottom-1 rounded-md shadow-sm flex items-center justify-center text-[10px] font-black text-white px-2 transition-all",
                            item.color,
                            isGanttEditMode ? "cursor-ew-resize hover:brightness-110" : ""
                          )}
                          style={{
                            left: `${(item.start / 6) * 100}%`,
                            width: `${(item.duration / 6) * 100}%`
                          }}
                        >
                          {item.duration}m
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isGanttEditMode && (
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Modification des Informations Gantt</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Tâche Sélectionnée" defaultValue="Ouvrages d'Art (Dalots)" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input label="Début (Mois)" type="number" min="0" defaultValue="2" />
                      <Input label="Durée (Mois)" type="number" min="1" defaultValue="3" />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      className="font-bold"
                      onClick={() => {
                        setIsUpdatingGanttPanel(true);
                        setTimeout(() => {
                          setIsUpdatingGanttPanel(false);
                          // task updated
                        }, 1000);
                      }}
                      disabled={isUpdatingGanttPanel}
                    >
                      {isUpdatingGanttPanel ? "Mise à jour..." : "Mettre à jour la Tâche"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setIsGanttModalOpen(false)} className="font-bold">{t('common.close')}</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Project Modal */}
        {isDeleteModalOpen && (
          <Modal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            title={t('projects.modals.confirm_delete')}
            size="sm"
          >
            <div className="space-y-6">
              <p className="text-sm text-slate-600">{t('projects.modals.delete_confirm_msg', { name: projectToDelete?.name })}</p>
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>{t('common.cancel')}</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 font-bold"
                  onClick={handleDeleteProject}
                  disabled={isDeletingProject}
                >
                  {isDeletingProject ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t('projects.modals.deleting')}
                    </>
                  ) : (
                    t('projects.modals.delete_btn')
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}
        {/* Export Gantt Modal */}
        <Modal
          isOpen={isExportGanttModalOpen}
          onClose={() => {
            setIsExportGanttModalOpen(false);
            setIsExportSuccess(false);
          }}
          title={t('projects.modals.export_gantt')}
          size="sm"
        >
          {isExportSuccess ? (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-600">{t('projects.modals.export_success') || 'Export réussi'}</p>
              <Button className="w-full font-bold" onClick={() => {
                setIsExportGanttModalOpen(false);
                setIsExportSuccess(false);
              }}>{t('projects.details.download_mpp')}</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">{t('projects.modals.export_format') || 'Format d\'export'}</label>
                <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  <option>MS Project XML (.xml)</option>
                  <option>MS Project (.mpp)</option>
                  <option>Excel (.xlsx)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">{t('projects.details.period')}</label>
                <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  <option>{t('common.all_sites')}</option>
                  <option>{t('projects.details.next_3_months')}</option>
                  <option>{t('projects.details.current_month')}</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setIsExportGanttModalOpen(false)} disabled={isExportingGantt}>{t('common.cancel')}</Button>
                <Button
                  className="font-bold"
                  onClick={() => {
                    setIsExportingGantt(true);

                    // Prepare tasks for export
                    const tasksToExport = [
                      { task: t('projects.export_tasks.earthworks'), start: 0, duration: 2, progress: 100 },
                      { task: t('projects.export_tasks.artworks'), start: 1, duration: 3, progress: 60 },
                      { task: t('projects.export_tasks.foundation'), start: 3, duration: 2, progress: 20 },
                      { task: t('projects.export_tasks.pavement'), start: 5, duration: 1, progress: 0 },
                    ].map(t => ({
                      'ACTIVITÉ / TÂCHE': t.task,
                      'DÉBUT (MOIS)': t.start + 1,
                      'DURÉE (MOIS)': t.duration,
                      'PROGRESSION': `${t.progress}%`
                    }));

                    setTimeout(() => {
                      exportToCSV(tasksToExport, `planning_gantt_${ganttProject?.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`);
                      setIsExportingGantt(false);
                      setIsExportSuccess(true);
                    }, 1500);
                  }}
                  disabled={isExportingGantt}
                >
                  {isExportingGantt ? t('common.modals.processing') : t('projects.modals.generate_export') || 'Générer l\'export'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Add Task Modal */}
        <Modal
          isOpen={isAddTaskModalOpen}
          onClose={() => setIsAddTaskModalOpen(false)}
          title={t('projects.modals.add_task')}
          size="md"
        >
          <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            setIsAddTaskModalOpen(false);
            // task added
          }}>
            <Input label={t('projects.tasks.table.task')} required />
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">{t('projects.wizard.category')}</label>
              <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                <option>{t('projects.export_tasks.earthworks').split(' &')[0]}</option>
                <option>{t('projects.export_tasks.artworks').split(' (')[0]}</option>
                <option>{t('projects.category.pavement')}</option>
                <option>{t('common.not_specified')}</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('projects.wizard.start_date')} type="date" min={today} required />
              <Input label={t('projects.details.contractual_end_date')} type="date" min={today} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('projects.tasks.table.responsible')} required />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">{t('projects.tasks.table.status')}</label>
                <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
                  <option>{t('projects.tasks.status.to_do')}</option>
                  <option>{t('projects.tasks.status.in_progress')}</option>
                  <option>{t('projects.tasks.status.done')}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setIsAddTaskModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="font-bold">{t('projects.tasks.add_task')}</Button>
            </div>
          </form>
        </Modal>

    </div>
  );
};
