import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight, Users, Package, AlertTriangle, ClipboardList,
  Pencil, Clock, Truck, ListChecks, ArrowLeft, FileText,
  MapPin, Gauge,
} from 'lucide-react';
import { Button, Modal, cn } from '../../components/ui';
import { useUser } from '../../context/UserContext';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { projectService } from '../../services/project.service';
import { attendanceService } from '../../services/attendance.service';
import { equipmentRequestService, EquipmentRequest } from '../../services/equipmentRequest.service';
import { projectFixedCostService, ProjectCostSummary } from '../../services/projectFixedCost.service';
import { ProjectTasksPanel } from '../../components/project/ProjectTasksPanel';
import { ProjectFixedCostsSection } from './ProjectFixedCostsSection';
import { ProjectDocumentsSection } from './ProjectDocumentsSection';
import { ProjectDailyReportsSection } from './ProjectDailyReportsSection';
import { ProjectPilotageSection } from './ProjectPilotageSection';
import { projectKpiService, type ProjectKpis } from '../../services/projectKpi.service';
import { formatDateShort, formatNumber, formatQuantityWithUnit } from '../../lib/formatters';
import { scrollToHashElement } from '../../lib/scrollToHash';
import type { Project } from '../../types/models';

const DETAIL_ROLES = ['Chef_chantier', 'Directeur technique'] as const;

type DetailTab = 'documents' | 'resources' | 'tracking' | 'pilotage' | 'field';

function SectionCard({
  id,
  icon: Icon,
  title,
  action,
  badge,
  children,
  compact = false,
}: {
  id?: string;
  icon: React.FC<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden',
        compact ? 'h-full flex flex-col' : '',
      )}
    >
      <SectionHeader title={title} Icon={Icon} action={action} badge={badge} compact={compact} />
      <div className={cn(compact ? 'p-3 sm:p-4 flex-1 min-h-0' : 'p-4 sm:p-6')}>{children}</div>
    </section>
  );
}

function SectionHeader({
  title,
  Icon,
  action,
  badge,
  compact = false,
}: {
  title: string;
  Icon: React.FC<{ className?: string }>;
  action?: React.ReactNode;
  badge?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2',
        compact ? 'px-3 sm:px-4 py-2.5' : 'px-4 sm:px-6 py-3 sm:py-4',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-slate-500 shrink-0" />
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider truncate">{title}</h3>
        {badge != null && badge > 0 && (
          <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      {action && <div className="shrink-0 self-start sm:self-center">{action}</div>}
    </div>
  );
}

function DetailTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: DetailTab; label: string; badge?: number }[];
  active: DetailTab;
  onChange: (id: DetailTab) => void;
}) {
  return (
    <nav
      className="sticky top-0 z-20 -mx-3 px-3 sm:-mx-0 sm:px-0 py-2 bg-slate-100/95 backdrop-blur-md border-b border-slate-200/80"
      aria-label="Sections chantier"
    >
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory scrollbar-thin [-webkit-overflow-scrolling:touch]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'snap-start shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wide transition-all min-h-[40px]',
              active === tab.id
                ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/25'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50',
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span
                className={cn(
                  'min-w-[1.125rem] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center',
                  active === tab.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700',
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

function ScrollablePanel({ children, maxHeight = 'max-h-52' }: { children: React.ReactNode; maxHeight?: string }) {
  return <div className={cn('overflow-y-auto overscroll-contain', maxHeight)}>{children}</div>;
}

function CountPill({ label, count, onClick }: { label: string; count: number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] sm:text-xs font-bold transition-colors min-h-[36px]"
    >
      {label}
      <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">
        {count}
      </span>
    </button>
  );
}

function KpiBox({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'ok' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'bg-rose-500/15 border-rose-400/20'
      : tone === 'warning'
        ? 'bg-amber-500/15 border-amber-400/20'
        : tone === 'ok'
          ? 'bg-emerald-500/15 border-emerald-400/20'
          : 'bg-white/5 border-white/10';
  const valueClass =
    tone === 'danger'
      ? 'text-rose-100'
      : tone === 'warning'
        ? 'text-amber-100'
        : tone === 'ok'
          ? 'text-emerald-100'
          : 'text-white';
  return (
    <div className={cn('rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 min-w-0', toneClass)}>
      <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5 truncate">
        {label}
      </p>
      <p className={cn('text-xs sm:text-sm font-bold break-words leading-tight', valueClass)}>{value}</p>
    </div>
  );
}

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role, profile } = useUser();
  const { can } = usePermissions();
  const {
    projects,
    employees,
    stockMovements,
    incidents,
    dailyReports,
  } = useData();

  const id = Number(projectId);
  const canAccess = DETAIL_ROLES.includes(role as typeof DETAIL_ROLES[number]);
  const canEditProject = can('modify_project');
  const canManageTasks = can('manage_tasks');

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceToday, setAttendanceToday] = useState(0);
  const [logistics, setLogistics] = useState<EquipmentRequest[]>([]);
  const [costSummary, setCostSummary] = useState<ProjectCostSummary | null>(null);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('documents');
  const [siteKpis, setSiteKpis] = useState<ProjectKpis | null>(null);
  const [kpisLoading, setKpisLoading] = useState(false);
  const isDt = role === 'Directeur technique';

  const today = new Date().toISOString().split('T')[0];

  const loadProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const fromList = projects.find((p) => p.id === id);
      const data = fromList || await projectService.getById(id);
      setProject(data as Project);

      if (role === 'Chef_chantier' && data.chefId && profile?.id && data.chefId !== profile.id) {
        setProject(null);
      }
    } catch {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id, projects, role, profile?.id]);

  const loadCostSummary = useCallback(async () => {
    if (!id) return;
    try {
      setCostSummary(await projectFixedCostService.getSummary(id));
    } catch {
      setCostSummary(null);
    }
  }, [id]);

  const loadExtras = useCallback(async () => {
    if (!id) return;
    try {
      const [att, reqs] = await Promise.all([
        attendanceService.getAll({ projectId: id, date: today, limit: 500 }),
        equipmentRequestService.getAll({ projectId: id }),
      ]);
      setAttendanceToday(att.stats?.present ?? att.records?.length ?? 0);
      setLogistics(reqs);
    } catch {
      setAttendanceToday(0);
      setLogistics([]);
    }
  }, [id, today]);

  const loadKpis = useCallback(async () => {
    if (!id) return;
    setKpisLoading(true);
    try {
      setSiteKpis(await projectKpiService.getByProject(id));
    } catch {
      setSiteKpis(null);
    } finally {
      setKpisLoading(false);
    }
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);
  useEffect(() => {
    if (id && canAccess) {
      loadExtras();
      loadCostSummary();
      loadKpis();
    }
  }, [id, canAccess, loadExtras, loadCostSummary, loadKpis]);

  const projectEmployees = useMemo(
    () => employees.filter((e) => Number(e.projectId) === id),
    [employees, id],
  );
  const permanentWorkers = useMemo(
    () => projectEmployees.filter((e) => !e.isLocal),
    [projectEmployees],
  );
  const providers = useMemo(
    () => projectEmployees.filter((e) => e.isLocal && (e.contract === 'Prestataire' || e.role?.toLowerCase().includes('prestataire'))),
    [projectEmployees],
  );

  const stockForProject = useMemo(
    () => stockMovements.filter((m) => Number(m.projectId) === id),
    [stockMovements, id],
  );
  const incidentsForProject = useMemo(
    () => incidents.filter((i) => Number(i.projectId) === id),
    [incidents, id],
  );
  const reportsForProject = useMemo(
    () => dailyReports.filter((r) => Number(r.projectId) === id),
    [dailyReports, id],
  );
  const dailyReportCount = reportsForProject.length;

  const goToTab = useCallback((tab: DetailTab, sectionId?: string) => {
    setActiveTab(tab);
    if (sectionId) {
      requestAnimationFrame(() => {
        window.location.hash = sectionId;
        scrollToHashElement(sectionId.replace('#', ''));
      });
    }
  }, []);

  const detailTabs = useMemo(
    () => [
      { id: 'documents' as const, label: t('projectDetail.tabs.documents'), badge: undefined },
      {
        id: 'resources' as const,
        label: t('projectDetail.tabs.resources'),
        badge: stockForProject.length + projectEmployees.length + logistics.length,
      },
      { id: 'tracking' as const, label: t('projectDetail.tabs.tracking'), badge: undefined },
      {
        id: 'pilotage' as const,
        label: t('projectDetail.tabs.pilotage'),
        badge: siteKpis?.openIncidents ? siteKpis.openIncidents : undefined,
      },
      {
        id: 'field' as const,
        label: t('projectDetail.tabs.field'),
        badge: incidentsForProject.length + dailyReportCount,
      },
    ],
    [t, stockForProject.length, projectEmployees.length, logistics.length, incidentsForProject.length, dailyReportCount, siteKpis?.openIncidents],
  );

  const handleProgressChange = useCallback((progress: number) => {
    setProject((p) => (p && p.progress !== progress ? { ...p, progress } : p));
  }, []);

  if (!canAccess) {
    return <Navigate to="/projects" replace />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <NotFoundView t={t} onBack={() => navigate('/projects')} />
    );
  }

  const budget = Number(project.budget || project.montantMarche || 0);
  const progress = project.progress ?? 0;
  const budgetPct = siteKpis?.budgetConsumedPct ?? 0;
  const budgetTone = siteKpis?.budgetConsumedLevel ?? 'ok';

  return (
    <div className="min-h-full bg-slate-100/80 pb-8 sm:pb-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-3 sm:space-y-4">
        <header className="space-y-2 sm:space-y-3">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[var(--color-primary)] transition-colors -ml-1 px-1 py-1 rounded-lg hover:bg-white/80"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span>{t('projectDetail.back_to_projects')}</span>
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('projectDetail.title')}
            </h1>
            <nav
              className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:text-sm text-slate-500 font-medium mt-1"
              aria-label="Fil d'Ariane"
            >
              <Link to="/projects" className="hover:text-[var(--color-primary)] transition-colors shrink-0">
                {t('projects.title')}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden />
              <span className="text-slate-900 font-bold truncate max-w-full">{project.name}</span>
            </nav>
          </div>
        </header>

        {/* Carte sombre — résumé chantier */}
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-6 lg:p-8 shadow-xl shadow-slate-900/20">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight mb-1.5 sm:mb-2 break-words">
                {project.name}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm font-medium break-words">
                {project.client}
                {project.code && <span className="mx-1.5 sm:mx-2 text-slate-500">·</span>}
                {project.code && <span className="text-slate-400">{project.code}</span>}
              </p>
              {(project.location || project.region) && (
                <p className="text-slate-400 text-xs font-medium mt-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {[project.location, project.region].filter(Boolean).join(', ')}
                </p>
              )}
              <HeroMetaLine project={project} t={t} />
            </div>
            <span className="self-start shrink-0 px-2.5 sm:px-3 py-1 rounded-lg bg-amber-500/90 text-slate-900 text-[9px] sm:text-[10px] font-black uppercase tracking-widest max-w-full truncate">
              {project.status || t('projects.wizard.advancement_start')}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <KpiBox label={t('projectDetail.kpi.budget')} value={`${formatNumber(budget)} FCFA`} />
            <KpiBox
              label={t('projectDetail.kpi.budget_consumed')}
              value={kpisLoading && !siteKpis ? '…' : `${budgetPct} %`}
              tone={budgetTone}
            />
            <KpiBox label={t('projectDetail.kpi.start')} value={formatDateShort(project.startDate || project.start || '')} />
            <KpiBox label={t('projectDetail.kpi.end')} value={formatDateShort(project.endDate || project.end || '')} />
            <KpiBox label={t('projectDetail.kpi.progress')} value={`${progress.toFixed(2)} %`} />
          </div>

          <HeroPills
            t={t}
            attendanceToday={attendanceToday}
            stockCount={stockForProject.length}
            incidentCount={incidentsForProject.length}
            dailyReportCount={dailyReportCount}
            goToTab={goToTab}
          />

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
            <Button
              variant="outline"
              className="w-full sm:w-auto bg-white/5 border-white/20 text-white hover:bg-white/10 font-bold text-xs justify-center"
              onClick={() => setAttendanceModalOpen(true)}
            >
              <Clock className="w-4 h-4 mr-2 shrink-0" />
              {t('projectDetail.enter_attendance')}
            </Button>
            {canEditProject && (
              <Button
                variant="outline"
                className="w-full sm:w-auto bg-white/5 border-white/20 text-white hover:bg-white/10 font-bold text-xs justify-center"
                onClick={() => navigate('/projects', { state: { editProjectId: id } })}
              >
                <Pencil className="w-4 h-4 mr-2 shrink-0" />
                {t('projectDetail.edit_project')}
              </Button>
            )}
          </div>
        </div>

        <DetailTabBar tabs={detailTabs} active={activeTab} onChange={setActiveTab} />

        <div className="min-h-[320px]">
          {activeTab === 'documents' && (
            <SectionCard id="documents" icon={FileText} title={t('projectDetail.documents.title')}>
              <ProjectDocumentsSection
                projectId={id}
                canEdit={role === 'Chef_chantier' || canEditProject}
                projectName={project.name}
                projectCode={project.code}
                clientName={project.client}
                projectLocation={project.location}
              />
            </SectionCard>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                <SectionCard
                  id="stock"
                  compact
                  icon={Package}
                  title={t('projectDetail.stock.title')}
                  badge={stockForProject.length}
                  action={
                    <Link to="/resources" className="text-[10px] font-bold text-[var(--color-primary)] hover:underline shrink-0">
                      {t('projectDetail.stock.manage')} →
                    </Link>
                  }
                >
                  {stockForProject.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium py-2 text-center">{t('projectDetail.stock.empty')}</p>
                  ) : (
                    <ScrollablePanel maxHeight="max-h-56">
                      <StockTable rows={stockForProject} t={t} compact />
                    </ScrollablePanel>
                  )}
                </SectionCard>

                <SectionCard
                  id="logistique"
                  compact
                  icon={Truck}
                  title={t('projectDetail.logistics.title')}
                  badge={logistics.length}
                >
                  {logistics.length === 0 ? (
                    <p className="text-sm text-slate-400 font-medium py-2 text-center">{t('projectDetail.logistics.empty')}</p>
                  ) : (
                    <ScrollablePanel maxHeight="max-h-56">
                      <LogisticsTable logistics={logistics} t={t} compact />
                    </ScrollablePanel>
                  )}
                </SectionCard>
              </div>

              <SectionCard
                id="rh"
                compact
                icon={Users}
                title={t('projectDetail.rh.title')}
                badge={projectEmployees.length}
                action={
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                    {t('projectDetail.pills.attendance')} : {attendanceToday}
                  </span>
                }
              >
                <RhCompactBlock
                  t={t}
                  permanentWorkers={permanentWorkers}
                  providers={providers}
                  costSummary={costSummary}
                />
              </SectionCard>

              <ProjectFixedCostsSection
                projectId={id}
                canEdit={canEditProject}
                onSummaryChange={loadCostSummary}
                compact
              />
            </div>
          )}

          {activeTab === 'tracking' && (
            <SectionCard id="tasks" icon={ListChecks} title={t('projectDetail.tasks.title')}>
              <ProjectTasksPanel
                projectId={id}
                canEdit={canManageTasks}
                onProgressChange={(p) => {
                  handleProgressChange(p);
                  loadKpis();
                }}
              />
            </SectionCard>
          )}

          {activeTab === 'pilotage' && (
            <SectionCard id="pilotage" icon={Gauge} title={t('projectDetail.pilotage.title')}>
              <ProjectPilotageSection
                kpis={siteKpis}
                loading={kpisLoading}
                isDt={isDt}
                onRefresh={loadKpis}
                onGoToTab={goToTab}
              />
            </SectionCard>
          )}

          {activeTab === 'field' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <SectionCard
                id="signalements"
                compact
                icon={AlertTriangle}
                title={t('projectDetail.incidents.title')}
                badge={incidentsForProject.length}
              >
                {incidentsForProject.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">{t('projectDetail.incidents.empty')}</p>
                ) : (
                  <ScrollablePanel maxHeight="max-h-[28rem]">
                    <ul className="space-y-2">
                      {incidentsForProject.map((inc, i) => (
                        <li key={inc.id ?? i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-sm font-bold text-slate-800 leading-tight">{inc.title || inc.type}</p>
                          {(inc.desc || inc.description) && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{inc.desc || inc.description}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </ScrollablePanel>
                )}
              </SectionCard>

              <SectionCard
                id="rapports"
                compact
                icon={ClipboardList}
                title={t('projectDetail.dailyReports.title')}
                badge={dailyReportCount}
              >
                <ScrollablePanel maxHeight="max-h-[28rem]">
                  <ProjectDailyReportsSection
                    projectId={id}
                    reports={reportsForProject}
                    role={role || ''}
                    userId={profile?.id}
                  />
                </ScrollablePanel>
              </SectionCard>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        title={t('projectDetail.enter_attendance')}
        size="lg"
      >
        <p className="text-sm text-slate-600 mb-4">{t('projectDetail.attendance_redirect')}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setAttendanceModalOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => { setAttendanceModalOpen(false); navigate(`/resources#pointage`); }}>
            {t('projectDetail.go_to_attendance')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

function CostStat({ label, value, suffix = ' FCFA', compact = false }: { label: string; value: number; suffix?: string; compact?: boolean }) {
  return (
    <div className={cn('rounded-lg bg-slate-50 border border-slate-100', compact ? 'p-2.5' : 'p-4')}>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 leading-tight">{label}</p>
      <p className={cn('font-black text-slate-900', compact ? 'text-sm' : 'text-lg')}>
        {suffix === '' ? value : `${formatNumber(value)}${suffix}`}
      </p>
    </div>
  );
}

function NotFoundView({ t, onBack }: { t: (k: string) => string; onBack: () => void }) {
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[var(--color-primary)] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('projectDetail.back_to_projects')}
      </button>
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
        <p className="text-slate-600 font-medium">{t('projectDetail.not_found')}</p>
      </div>
    </div>
  );
}

function HeroPills({
  t,
  attendanceToday,
  stockCount,
  incidentCount,
  dailyReportCount,
  goToTab,
}: {
  t: (k: string) => string;
  attendanceToday: number;
  stockCount: number;
  incidentCount: number;
  dailyReportCount: number;
  goToTab: (tab: DetailTab, sectionId?: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      <CountPill label={t('projectDetail.pills.attendance')} count={attendanceToday} onClick={() => goToTab('resources', 'rh')} />
      <CountPill label={t('projectDetail.pills.stock')} count={stockCount} onClick={() => goToTab('resources', 'stock')} />
      <CountPill label={t('projectDetail.pills.reports')} count={incidentCount} onClick={() => goToTab('field', 'signalements')} />
      <CountPill label={t('projectDetail.pills.daily_reports')} count={dailyReportCount} onClick={() => goToTab('field', 'rapports')} />
    </div>
  );
}

const tableCell = (compact: boolean) => (compact ? 'px-3 py-2' : 'px-6 py-3');

type StockRow = {
  id?: number;
  item?: string;
  type?: string;
  qty?: number;
  quantity?: number;
  unit?: string;
  movementDate?: string;
  date?: string;
};

function StockTable({
  rows,
  t,
  compact = false,
}: {
  rows: StockRow[];
  t: (k: string) => string;
  compact?: boolean;
}) {
  const cell = tableCell(compact);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
          <th className={cell}>{t('projectDetail.stock.col_material')}</th>
          <th className={cell}>{t('projectDetail.stock.col_type')}</th>
          <th className={cell}>{t('projectDetail.stock.col_qty')}</th>
          <th className={cn(cell, 'hidden sm:table-cell')}>{t('projectDetail.stock.col_date')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {rows.map((m, i) => (
          <tr key={m.id ?? i}>
            <td className={cn(cell, 'font-bold text-slate-800')}>{m.item}</td>
            <td className={cn(cell, 'text-slate-600')}>{m.type}</td>
            <td className={cn(cell, 'text-slate-600')}>{formatQuantityWithUnit(m.qty || m.quantity, m.unit)}</td>
            <td className={cn(cell, 'text-slate-500 hidden sm:table-cell')}>{formatDateShort(m.movementDate || m.date || '')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LogisticsTable({
  logistics,
  t,
  compact = false,
}: {
  logistics: EquipmentRequest[];
  t: (k: string) => string;
  compact?: boolean;
}) {
  const cell = tableCell(compact);
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
          <th className={cell}>{t('projectDetail.logistics.col_ref')}</th>
          <th className={cell}>{t('projectDetail.logistics.col_desc')}</th>
          <th className={cn(cell, 'hidden md:table-cell')}>{t('projectDetail.logistics.col_date')}</th>
          <th className={cell}>{t('projectDetail.logistics.col_status')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {logistics.map((req) => (
          <tr key={req.id}>
            <td className={cn(cell, 'font-bold text-slate-800')}>{req.ref}</td>
            <td className={cn(cell, 'text-slate-600 max-w-[8rem] truncate')}>{req.needDescription}</td>
            <td className={cn(cell, 'text-slate-500 hidden md:table-cell')}>{formatDateShort(req.desiredDate)}</td>
            <td className={cell}>
              <span
                className={cn(
                  'text-[9px] font-black uppercase px-1.5 py-0.5 rounded',
                  req.status === 'Approuvée' ? 'bg-emerald-100 text-emerald-700' :
                  req.status === 'Rejetée' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700',
                )}
              >
                {req.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RhCompactBlock({
  t,
  permanentWorkers,
  providers,
  costSummary,
}: {
  t: (k: string) => string;
  permanentWorkers: { id?: number; name: string; role?: string }[];
  providers: { id?: number; name: string; phone?: string; role?: string }[];
  costSummary: ProjectCostSummary | null;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-h-0">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('projectDetail.rh.permanent')} ({permanentWorkers.length})
          </h4>
          {permanentWorkers.length === 0 ? (
            <p className="text-xs text-slate-400">{t('projectDetail.rh.no_permanent')}</p>
          ) : (
            <ScrollablePanel maxHeight="max-h-32">
              <ul className="space-y-1">
                {permanentWorkers.map((e, i) => (
                  <li key={e.id ?? i} className="text-xs font-medium text-slate-700 flex justify-between gap-2 py-0.5">
                    <span className="font-bold truncate">{e.name}</span>
                    <span className="text-slate-400 shrink-0">{e.role}</span>
                  </li>
                ))}
              </ul>
            </ScrollablePanel>
          )}
        </div>
        <div className="min-h-0">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {t('projectDetail.rh.providers')} ({providers.length})
          </h4>
          {providers.length === 0 ? (
            <p className="text-xs text-slate-400">{t('projectDetail.rh.no_providers')}</p>
          ) : (
            <ScrollablePanel maxHeight="max-h-32">
              <ul className="space-y-1">
                {providers.map((e, i) => (
                  <li key={e.id ?? i} className="text-xs font-medium text-slate-700 flex justify-between gap-2 py-0.5">
                    <span className="font-bold truncate">{e.name}</span>
                    <span className="text-slate-400 shrink-0">{e.phone || e.role}</span>
                  </li>
                ))}
              </ul>
            </ScrollablePanel>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
        <CostStat compact label={t('projectDetail.rh.daily_cost')} value={costSummary?.dailyCost ?? 0} />
        <CostStat compact label={t('projectDetail.rh.weekly_cost')} value={costSummary?.weeklyCost ?? 0} />
        <CostStat compact label={t('projectDetail.rh.fixed_total')} value={costSummary?.totalFixedAmount ?? 0} />
        <CostStat compact label={t('projectDetail.rh.fixed_count')} value={costSummary?.fixedCostsCount ?? 0} suffix="" />
      </div>
    </div>
  );
}

function computeDurationMonths(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) months -= 1;
  return Math.max(0, months);
}

function formatCategoryLabel(project: Project): string | null {
  const parts: string[] = [];
  if (project.category && project.category !== 'Autre') parts.push(project.category);
  else if (project.category === 'Autre') parts.push('Autre');
  if (project.subCategory) parts.push(project.subCategory);
  return parts.length ? parts.join(' · ') : null;
}

function formatGuarantee(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  return trimmed.includes('%') ? trimmed : `${trimmed} %`;
}

function HeroMetaLine({
  project,
  t,
}: {
  project: Project;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const duration = computeDurationMonths(project.startDate || project.start, project.endDate || project.end);
  const parts: string[] = [];

  const category = formatCategoryLabel(project);
  if (category) parts.push(category);
  if (project.manager?.trim()) parts.push(project.manager.trim());
  if (duration != null) parts.push(t('projectDetail.info.duration_value', { count: duration }));
  if (project.airRate?.trim()) parts.push(`${t('projectDetail.info.air_short')} ${project.airRate.trim()}`);
  const guarantee = formatGuarantee(project.guaranteeRetention);
  if (guarantee) parts.push(`${t('projectDetail.info.guarantee_short')} ${guarantee}`);
  if (project.guaranteeBank?.trim()) parts.push(project.guaranteeBank.trim());

  if (parts.length === 0) return null;

  return (
    <p className="mt-2 text-[10px] sm:text-[11px] leading-relaxed text-slate-500 font-medium break-words">
      {parts.map((part, i) => (
        <React.Fragment key={`${i}-${part}`}>
          {i > 0 && <span className="text-slate-600 mx-1.5">·</span>}
          <span className="text-slate-400">{part}</span>
        </React.Fragment>
      ))}
    </p>
  );
}
