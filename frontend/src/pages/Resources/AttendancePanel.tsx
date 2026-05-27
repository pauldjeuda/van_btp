/**
 * Pointage — interface Chef (gestion du jour) et DG/RH (historique par chantier).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  Clock, LogIn, LogOut, UserX, Calendar, Filter, ChevronLeft, ChevronRight,
  Users, CheckCircle2, AlertTriangle, XCircle, History, Search, FileSpreadsheet,
} from 'lucide-react';
import { Card, Button, cn } from '../../components/ui';
import { attendanceService, AttendanceAction } from '../../services/attendance.service';
import { useNotification } from '../../context/NotificationContext';
import { exportPayrollRecapToExcel } from '../../lib/attendancePayrollExport';
import type { Role } from '../../context/UserContext';

interface ProjectOption {
  id: number;
  name: string;
}

interface EmployeeRow {
  id: number;
  name: string;
  matricule?: string;
  role?: string;
  projectId?: number;
}

interface AttendancePanelProps {
  role: Role | null;
  projects: ProjectOption[];
  employees: EmployeeRow[];
  chefProjectIds?: number[];
}

const STATUS_STYLES: Record<string, string> = {
  'Présent': 'bg-emerald-100 text-emerald-800',
  'Retard': 'bg-amber-100 text-amber-800',
  'Absent': 'bg-red-100 text-red-800',
  'Demi-journée': 'bg-blue-100 text-blue-800',
};

function defaultPeriod() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

const STATUS_I18N: Record<string, string> = {
  'Présent': 'resources.pointage.status_present',
  'Retard': 'resources.pointage.status_late',
  'Absent': 'resources.pointage.status_absent',
  'Demi-journée': 'resources.pointage.status_half_day',
};

function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation();
  if (!status) {
    return <span className="text-[10px] font-bold text-slate-400 uppercase">{t('resources.pointage.not_marked')}</span>;
  }
  const label = STATUS_I18N[status] ? t(STATUS_I18N[status]) : status;
  return (
    <span className={cn('text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md', STATUS_STYLES[status] || 'bg-slate-100 text-slate-600')}>
      {label}
    </span>
  );
}

function ChefAttendanceView({
  projects,
  employees,
  chefProjectIds,
}: {
  projects: ProjectOption[];
  employees: EmployeeRow[];
  chefProjectIds: number[];
}) {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const today = new Date().toISOString().split('T')[0];
  const period = defaultPeriod();

  const [projectId, setProjectId] = useState<number>(chefProjectIds[0] || 0);
  const [workDate, setWorkDate] = useState(today);
  const [todayByEmployee, setTodayByEmployee] = useState<Record<number, any>>({});
  const [loadingToday, setLoadingToday] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [histFrom, setHistFrom] = useState(period.from);
  const [histTo, setHistTo] = useState(period.to);
  const [histStatus, setHistStatus] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [history, setHistory] = useState<any[]>([]);
  const [histPagination, setHistPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [loadingHist, setLoadingHist] = useState(false);

  const siteEmployees = useMemo(() => {
    let list = employees.filter((e) => Number(e.projectId) === Number(projectId));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => 
        e.name.toLowerCase().includes(q) || 
        (e.matricule && e.matricule.toLowerCase().includes(q)) ||
        (e.role && e.role.toLowerCase().includes(q))
      );
    }
    return list;
  }, [employees, projectId, searchQuery]);

  const loadToday = useCallback(async () => {
    if (!projectId) return;
    setLoadingToday(true);
    try {
      const res = await attendanceService.getAll({
        projectId,
        date: workDate,
        limit: 200,
      });
      const map: Record<number, any> = {};
      (res.records || []).forEach((r: any) => {
        map[r.employeeId] = r;
      });
      setTodayByEmployee(map);
    } catch {
      setTodayByEmployee({});
    } finally {
      setLoadingToday(false);
    }
  }, [projectId, workDate]);

  const loadHistory = useCallback(async () => {
    if (!projectId) return;
    setLoadingHist(true);
    try {
      const res = await attendanceService.getAll({
        projectId,
        fromDate: histFrom,
        toDate: histTo,
        status: histStatus || undefined,
        page: histPage,
        limit: 15,
      });
      setHistory(res.records || []);
      setHistPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 0 });
    } catch {
      setHistory([]);
    } finally {
      setLoadingHist(false);
    }
  }, [projectId, histFrom, histTo, histStatus, histPage]);

  useEffect(() => {
    if (projectId) loadToday();
  }, [projectId, workDate, loadToday]);

  useEffect(() => {
    if (projectId) loadHistory();
  }, [projectId, histFrom, histTo, histStatus, histPage, loadHistory]);

  const runAction = async (employeeId: number, action: AttendanceAction) => {
    setActingId(employeeId);
    try {
      await attendanceService.mark({ employeeId, projectId, date: workDate, action });
      notify(t('resources.pointage.action_ok'), 'success');
      await loadToday();
      await loadHistory();
    } catch (err: any) {
      notify(err?.message || t('resources.errors.attendance_error'), 'error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('resources.pointage.daily_title')}</h3>
            <p className="text-xs text-slate-500 mt-1">{t('resources.pointage.daily_subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={projectId}
              onChange={(e) => setProjectId(Number(e.target.value))}
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-white"
            >
              {projects.filter((p) => chefProjectIds.includes(p.id)).map((p, i) => (
                <option key={p.id || `proj-${i}`} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={workDate}
              max={today}
              onChange={(e) => setWorkDate(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
            />
            <Button variant="outline" size="sm" onClick={loadToday} className="font-bold">
              <Clock className="w-4 h-4 mr-1" /> Actualiser
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 h-10 rounded-xl border border-slate-200 shadow-sm focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)] transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un employé (nom, matricule, rôle)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400"
          />
        </div>

        <Card className="border-none shadow-lg overflow-hidden">
          {loadingToday ? (
            <div className="p-12 flex justify-center">
              <div className="h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : siteEmployees.length === 0 ? (
            <p className="p-12 text-center text-slate-400 font-bold text-sm">
              {t('resources.pointage.no_employees')}
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {siteEmployees.map((emp, i) => {
                const rec = todayByEmployee[emp.id];
                const busy = actingId === emp.id;
                const hasArrival = !!rec?.arrivalTime;
                const hasDeparture = !!rec?.departureTime;
                const isAbsent = rec?.status === 'Absent';

                return (
                  <div
                    key={emp.id || `emp-${i}`}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 truncate">{emp.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {emp.role || '—'} {emp.matricule ? `• ${emp.matricule}` : ''}
                      </p>
                      {rec && (
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                          {rec.arrivalTime && <span>↑ {rec.arrivalTime}</span>}
                          {rec.departureTime && <span className="ml-3">↓ {rec.departureTime}</span>}
                          {rec.lateMinutes > 0 && (
                            <span className="ml-3 text-amber-600 font-bold">+{rec.lateMinutes} min</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={rec?.status} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isAbsent && !hasArrival && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => runAction(emp.id, 'arrival')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase"
                        >
                          <LogIn className="w-3.5 h-3.5 mr-1" /> {t('resources.pointage.arrival')}
                        </Button>
                      )}
                      {!isAbsent && hasArrival && !hasDeparture && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => runAction(emp.id, 'departure')}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] uppercase"
                        >
                          <LogOut className="w-3.5 h-3.5 mr-1" /> {t('resources.pointage.departure')}
                        </Button>
                      )}
                      {!rec && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => runAction(emp.id, 'present')}
                          className="font-bold text-[10px] uppercase"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {t('resources.pointage.mark_present')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || isAbsent}
                        onClick={() => runAction(emp.id, 'absent')}
                        className="border-red-200 text-red-700 hover:bg-red-50 font-bold text-[10px] uppercase"
                      >
                        <UserX className="w-3.5 h-3.5 mr-1" /> {t('resources.pointage.absent')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => runAction(emp.id, 'half_day')}
                        className="font-bold text-[10px] uppercase text-blue-700"
                      >
                        {t('resources.pointage.half_day')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--color-primary)]" />
            {t('resources.pointage.history')}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <input type="date" value={histFrom} onChange={(e) => { setHistPage(1); setHistFrom(e.target.value); }}
              className="h-9 px-2 rounded-lg border border-slate-200 text-xs font-bold" />
            <span className="text-slate-400 text-xs">→</span>
            <input type="date" value={histTo} onChange={(e) => { setHistPage(1); setHistTo(e.target.value); }}
              className="h-9 px-2 rounded-lg border border-slate-200 text-xs font-bold" />
            <select value={histStatus} onChange={(e) => { setHistPage(1); setHistStatus(e.target.value); }}
              className="h-9 px-2 rounded-lg border border-slate-200 text-xs font-bold">
              <option key="status-all" value="">{t('resources.pointage.all_statuses')}</option>
              <option value="Présent">{t('resources.pointage.status_present')}</option>
              <option value="Retard">{t('resources.pointage.status_late')}</option>
              <option value="Absent">{t('resources.pointage.status_absent')}</option>
              <option value="Demi-journée">{t('resources.pointage.status_half_day')}</option>
            </select>
          </div>
        </div>
        <HistoryTable records={history} loading={loadingHist} showProject={false} />
        <Pagination page={histPagination.page} totalPages={histPagination.totalPages} total={histPagination.total} onPage={setHistPage} />
      </section>
    </div>
  );
}

function DirectorAttendanceView({ projects }: { projects: ProjectOption[] }) {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const period = defaultPeriod();
  const today = new Date().toISOString().split('T')[0];

  const [projectId, setProjectId] = useState<number>(0);
  const [histFrom, setHistFrom] = useState(period.from);
  const [histTo, setHistTo] = useState(period.to);
  const [histStatus, setHistStatus] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, halfDay: 0, total: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);

  const [exportPeriodType, setExportPeriodType] = useState<'week' | 'month'>('week');
  const [exportReferenceDate, setExportReferenceDate] = useState(today);
  const [exportProjectId, setExportProjectId] = useState(0);
  const [exportingPayroll, setExportingPayroll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getAll({
        projectId: projectId || undefined,
        fromDate: histFrom,
        toDate: histTo,
        status: histStatus || undefined,
        page: histPage,
        limit: 20,
      });
      setHistory(res.records || []);
      setPagination(res.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      if (res.stats) setStats(res.stats as typeof stats);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, histFrom, histTo, histStatus, histPage]);

  useEffect(() => { load(); }, [load]);

  const handleExportPayroll = async () => {
    setExportingPayroll(true);
    try {
      const referenceDate =
        exportPeriodType === 'month' && exportReferenceDate.length === 7
          ? `${exportReferenceDate}-01`
          : exportReferenceDate;

      const recap = await attendanceService.getPayrollRecap({
        periodType: exportPeriodType,
        referenceDate,
        projectId: exportProjectId || undefined,
      });

      if (!recap?.rows?.length) {
        notify(t('resources.pointage.export_empty'), 'warning');
        return;
      }

      exportPayrollRecapToExcel(recap);
      notify(t('resources.pointage.export_success'), 'success');
    } catch (err: any) {
      notify(err?.message || t('resources.pointage.export_error'), 'error');
    } finally {
      setExportingPayroll(false);
    }
  };

  const exportMonthValue = exportReferenceDate.slice(0, 7);

  return (
    <motion.div className="space-y-6" initial={false}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('resources.pointage.dg_title')}</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            {t('resources.pointage.dg_subtitle')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="font-bold">
          <Clock className="w-4 h-4 mr-1" /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: t('resources.pointage.stat_total'), value: pagination.total, color: 'text-slate-700' },
          { label: t('resources.pointage.present_stat'), value: stats.present, color: 'text-emerald-600' },
          { label: t('resources.pointage.late_stat'), value: stats.late, color: 'text-amber-600' },
          { label: t('resources.pointage.absent_stat'), value: stats.absent, color: 'text-red-600' },
          { label: t('resources.pointage.half_day_stat'), value: stats.halfDay, color: 'text-blue-600' },
        ].map((s, i) => (
          <Card key={s.label || `stat-${i}`} className="p-4 border-none shadow-md">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className={cn('text-2xl font-black mt-1', s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5 md:p-6 border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
        <motion.div className="relative space-y-4" initial={false}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                {t('resources.pointage.export_payroll_title')}
              </h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">{t('resources.pointage.export_payroll_subtitle')}</p>
            </div>
            <Button
              onClick={handleExportPayroll}
              disabled={exportingPayroll}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-lg shadow-emerald-900/30 shrink-0"
            >
              {exportingPayroll ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              {exportingPayroll ? t('resources.pointage.exporting') : t('resources.pointage.export_payroll')}
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3 pt-2">
            <div className="flex rounded-xl overflow-hidden border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setExportPeriodType('week')}
                className={cn(
                  'px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all',
                  exportPeriodType === 'week' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white',
                )}
              >
                {t('resources.pointage.period_week')}
              </button>
              <button
                type="button"
                onClick={() => setExportPeriodType('month')}
                className={cn(
                  'px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all',
                  exportPeriodType === 'month' ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white',
                )}
              >
                {t('resources.pointage.period_month')}
              </button>
            </div>

            {exportPeriodType === 'month' ? (
              <motion.div className="space-y-1" initial={false}>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t('resources.pointage.reference_month')}
                </label>
                <input
                  type="month"
                  value={exportMonthValue}
                  max={today.slice(0, 7)}
                  onChange={(e) => setExportReferenceDate(e.target.value || today.slice(0, 7))}
                  className="h-10 px-3 rounded-xl border border-white/20 bg-white/10 text-sm font-bold text-white block"
                />
              </motion.div>
            ) : (
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t('resources.pointage.reference_date')}
                </label>
                <input
                  type="date"
                  value={exportReferenceDate}
                  max={today}
                  onChange={(e) => setExportReferenceDate(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-white/20 bg-white/10 text-sm font-bold text-white block"
                />
              </div>
            )}

            <div className="space-y-1 flex-1 min-w-[180px]">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('common.site')}
              </label>
              <select
                value={exportProjectId}
                onChange={(e) => setExportProjectId(Number(e.target.value))}
                className="h-10 px-3 rounded-xl border border-white/20 bg-white/10 text-sm font-bold text-white w-full"
              >
                <option value={0} className="text-slate-900">{t('resources.all_sites')}</option>
                {projects.map((p, i) => (
                  <option key={p.id || `export-proj-${i}`} value={p.id} className="text-slate-900">{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-medium leading-relaxed border-t border-white/10 pt-3">
            Absence ou jour non pointé = déduction du taux journalier (salaire hebdo ÷ 5). Demi-journée = −50 %.
          </p>
        </motion.div>
      </Card>

      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <select
          value={projectId}
          onChange={(e) => { setHistPage(1); setProjectId(Number(e.target.value)); }}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold flex-1 min-w-[200px]"
        >
          <option value={0}>{t('resources.all_sites')}</option>
          {projects.map((p, i) => (
            <option key={p.id || `proj-dg-${i}`} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input type="date" value={histFrom} onChange={(e) => { setHistPage(1); setHistFrom(e.target.value); }}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold" />
        <span className="text-slate-400">→</span>
        <input type="date" value={histTo} onChange={(e) => { setHistPage(1); setHistTo(e.target.value); }}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold" />
        <select value={histStatus} onChange={(e) => { setHistPage(1); setHistStatus(e.target.value); }}
          className="h-10 px-3 rounded-xl border border-slate-200 text-sm font-bold">
          <option key="status-all" value="">{t('resources.pointage.all_statuses')}</option>
          <option value="Présent">{t('resources.pointage.status_present')}</option>
          <option value="Retard">{t('resources.pointage.status_late')}</option>
          <option value="Absent">{t('resources.pointage.status_absent')}</option>
          <option value="Demi-journée">{t('resources.pointage.status_half_day')}</option>
        </select>
      </div>

      <HistoryTable records={history} loading={loading} showProject />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onPage={setHistPage} />
    </motion.div>
  );
}

function HistoryTable({
  records,
  loading,
  showProject = false,
}: {
  records: any[];
  loading: boolean;
  showProject?: boolean;
}) {
  const { t } = useTranslation();
  const colSpan = 5 + 1 + (showProject ? 1 : 0);

  return (
    <Card className="border-none shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">{t('resources.pointage.employee')}</th>
              <th className="px-5 py-4">{t('common.status')}</th>
              <th className="px-5 py-4">{t('resources.pointage.arrival_col')}</th>
              <th className="px-5 py-4">{t('resources.pointage.departure_col')}</th>
              <th className="px-5 py-4">{t('resources.pointage.late_col')}</th>
              {showProject && <th className="px-5 py-4">{t('common.site')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={colSpan} className="py-12 text-center">
                <div className="h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={colSpan} className="py-12 text-center text-slate-400 font-bold text-sm">{t('resources.pointage.no_records')}</td></tr>
            ) : (
              records.map((rec, i) => (
                <tr key={rec.id || `rec-${i}`} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3 text-xs font-black text-slate-900">
                    {new Date(rec.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-xs font-bold text-slate-800">
                    {rec.employee?.name || `ID ${rec.employeeId}`}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={rec.status} /></td>
                  <td className="px-5 py-3 text-xs font-mono font-bold text-slate-600">{rec.arrivalTime || '—'}</td>
                  <td className="px-5 py-3 text-xs font-mono font-bold text-slate-600">{rec.departureTime || '—'}</td>
                  <td className="px-5 py-3 text-xs">
                    {rec.lateMinutes > 0 ? (
                      <span className="font-bold text-amber-600">+{rec.lateMinutes} min</span>
                    ) : '—'}
                  </td>
                  {showProject && (
                    <td className="px-5 py-3 text-xs font-bold text-slate-500">
                      {rec.project?.name || '—'}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1 && total === 0) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-slate-500 font-bold text-xs">{total} enregistrement(s)</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-black text-slate-600 px-2">{page} / {Math.max(1, totalPages)}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function AttendancePanel({ role, projects, employees, chefProjectIds = [] }: AttendancePanelProps) {
  const isChefSite = role === 'Chef_chantier';
  const canViewHistory = role === 'Directeur technique';

  if (!isChefSite && !canViewHistory) return null;

  const projectIds = chefProjectIds.length ? chefProjectIds : projects.map((p) => p.id);

  return (
    <div className="space-y-10">
      {isChefSite && (
        <ChefAttendanceView
          projects={projects}
          employees={employees}
          chefProjectIds={projectIds}
        />
      )}
      {canViewHistory && <DirectorAttendanceView projects={projects} />}
    </div>
  );
}

