import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  PieChart as PieChartIcon,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
} from 'recharts';
import { cn, Button } from '../../components/ui';
import { formatNumber } from '../../lib/formatters';
import type { ProjectKpis, BudgetConsumedLevel } from '../../services/projectKpi.service';

type DetailTab = 'documents' | 'resources' | 'tracking' | 'pilotage' | 'field';

const LEVEL = {
  ok: { bar: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  warning: { bar: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  danger: { bar: 'bg-red-500', text: 'text-red-700', badge: 'bg-red-50 text-red-700 border-red-100' },
} as const;

const TASK_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#94a3b8'];
const RISK_COLORS = ['#ef4444', '#f97316', '#8b5cf6', '#64748b'];

function formatMonthLabel(monthKey: string, locale: string): string {
  const [y, m] = monthKey.split('-');
  if (!y || !m) return monthKey;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(locale.startsWith('fr') ? 'fr-FR' : 'en-US', {
    month: 'short',
    year: '2-digit',
  });
}

interface Props {
  kpis: ProjectKpis | null;
  loading: boolean;
  isDt: boolean;
  onRefresh: () => void;
  onGoToTab: (tab: DetailTab, sectionId?: string) => void;
}

/** Synthèse décisionnelle en graphiques : budget, évolution temporelle, tâches & risques. */
export const ProjectPilotageSection: React.FC<Props> = ({
  kpis,
  loading,
  isDt,
  onRefresh,
  onGoToTab,
}) => {
  const { t, i18n } = useTranslation();

  const evolutionData = useMemo(() => {
    if (!kpis?.evolution?.length) return [];
    return kpis.evolution.map((p) => ({
      ...p,
      label: formatMonthLabel(p.monthKey, i18n.language),
      plannedProgress: p.plannedProgress ?? undefined,
    }));
  }, [kpis?.evolution, i18n.language]);

  const taskPieData = useMemo(() => {
    const b = kpis?.taskBreakdown;
    if (!b || b.total === 0) return [];
    return [
      { name: t('projectDetail.pilotage.chart_tasks_done'), value: b.done, key: 'done' },
      { name: t('projectDetail.pilotage.chart_tasks_progress'), value: b.inProgress, key: 'inProgress' },
      { name: t('projectDetail.pilotage.chart_tasks_blocked'), value: b.blocked, key: 'blocked' },
      { name: t('projectDetail.pilotage.chart_tasks_todo'), value: b.todo, key: 'todo' },
    ].filter((d) => d.value > 0);
  }, [kpis?.taskBreakdown, t]);

  const riskBarData = useMemo(() => {
    if (!kpis) return [];
    return [
      { name: t('projectDetail.pilotage.incidents'), value: kpis.openIncidents, tab: 'field' as const, section: 'signalements' },
      { name: t('projectDetail.pilotage.chart_overdue'), value: kpis.tasksOverdue, tab: 'tracking' as const, section: 'tasks' },
      { name: t('projectDetail.pilotage.chart_blocked'), value: kpis.tasksBlocked, tab: 'tracking' as const, section: 'tasks' },
      { name: t('projectDetail.pilotage.logistics'), value: kpis.logisticsPending, tab: 'resources' as const, section: 'logistique' },
    ];
  }, [kpis, t]);

  const budgetPieData = useMemo(() => {
    if (!kpis || kpis.budget <= 0) return [];
    const remaining = Math.max(0, kpis.budget - kpis.expenses);
    return [
      { name: t('projectDetail.pilotage.chart_spent'), value: kpis.expenses },
      { name: t('projectDetail.pilotage.chart_remaining'), value: remaining },
    ];
  }, [kpis, t]);

  if (loading && !kpis) {
    return (
      <div className="flex justify-center py-14">
        <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-[var(--color-primary)] animate-spin" />
      </div>
    );
  }

  if (!kpis) {
    return <p className="text-sm text-slate-500 py-6 text-center">{t('projectDetail.pilotage.unavailable')}</p>;
  }

  const lvl = LEVEL[kpis.budgetConsumedLevel] || LEVEL.ok;
  const barPct = Math.min(100, kpis.budgetConsumedPct);
  const hasDelay = kpis.delayDays != null && kpis.delayDays > 0;

  const tooltipStyle = {
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          {t('projectDetail.pilotage.intro')}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="shrink-0 font-bold text-slate-600"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          {t('projectDetail.pilotage.refresh')}
        </Button>
      </div>

      {/* Budget — synthèse */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                {t('projectDetail.pilotage.budget_consumed')}
              </p>
              <p className={cn('text-3xl font-black text-slate-900 tabular-nums', lvl.text)}>
                {kpis.budgetConsumedPct}
                <span className="text-lg font-bold text-slate-400"> %</span>
              </p>
            </div>
            {kpis.budget > 0 && (
              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-lg border', lvl.badge)}>
                {kpis.budgetConsumedLevel === 'danger'
                  ? t('projectDetail.pilotage.budget_over')
                  : kpis.budgetConsumedLevel === 'warning'
                    ? t('projectDetail.pilotage.budget_watch')
                    : t('projectDetail.pilotage.budget_ok')}
              </span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-2">
            <div
              className={cn('h-full rounded-full transition-all duration-500', lvl.bar)}
              style={{ width: `${barPct}%` }}
            />
          </div>
          {kpis.budget > 0 && (
            <p className="text-xs font-medium text-slate-500">
              {t('projectDetail.pilotage.budget_line', {
                spent: formatNumber(kpis.expenses),
                total: formatNumber(kpis.budget),
              })}
            </p>
          )}
        </div>

        {budgetPieData.length > 0 && (
          <ChartCard
            title={t('projectDetail.pilotage.chart_budget_title')}
            icon={<PieChartIcon className="w-4 h-4 text-indigo-500" />}
          >
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={58}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#6366f1" />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${formatNumber(v)} FCFA`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-[10px] font-bold text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                {t('projectDetail.pilotage.chart_spent')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-200" />
                {t('projectDetail.pilotage.chart_remaining')}
              </span>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Évolution temporelle */}
      {evolutionData.length > 0 && (
        <ChartCard
          title={t('projectDetail.pilotage.chart_timeline_title')}
          subtitle={t('projectDetail.pilotage.chart_timeline_sub')}
          icon={<TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />}
          className="p-5 sm:p-6"
        >
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolutionData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pilotBudgetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                />
                <YAxis
                  yAxisId="pct"
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  yAxisId="days"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      progress: t('projectDetail.pilotage.progress'),
                      plannedProgress: t('projectDetail.pilotage.chart_planned'),
                      budgetConsumedPct: t('projectDetail.pilotage.budget_consumed'),
                      attendanceDays: t('projectDetail.pilotage.chart_attendance'),
                      expensesMonth: t('projectDetail.pilotage.chart_expenses_month'),
                    };
                    const label = labels[name] || name;
                    if (name === 'attendanceDays' || name === 'expensesMonth') {
                      return [value, label];
                    }
                    if (name === 'expenses') {
                      return [`${formatNumber(value)} FCFA`, label];
                    }
                    return [`${value} %`, label];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '12px' }}
                  formatter={(value) => {
                    const map: Record<string, string> = {
                      progress: t('projectDetail.pilotage.progress'),
                      plannedProgress: t('projectDetail.pilotage.chart_planned'),
                      budgetConsumedPct: t('projectDetail.pilotage.budget_consumed'),
                      attendanceDays: t('projectDetail.pilotage.chart_attendance'),
                    };
                    return map[value] || value;
                  }}
                />
                <Area
                  yAxisId="pct"
                  type="monotone"
                  dataKey="budgetConsumedPct"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#pilotBudgetGrad)"
                  name="budgetConsumedPct"
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="progress"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  name="progress"
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="plannedProgress"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls
                  name="plannedProgress"
                />
                <Bar
                  yAxisId="days"
                  dataKey="attendanceDays"
                  fill="#fcd34d"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  name="attendanceDays"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">{t('projectDetail.pilotage.chart_timeline_hint')}</p>
        </ChartCard>
      )}

      {/* Tâches & risques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title={t('projectDetail.pilotage.tasks')}
          icon={<PieChartIcon className="w-4 h-4 text-emerald-500" />}
          action={
            <button
              type="button"
              onClick={() => onGoToTab('tracking', 'tasks')}
              className="text-[10px] font-bold text-[var(--color-primary)] hover:underline"
            >
              → {t('projectDetail.pilotage.chart_view_tasks')}
            </button>
          }
        >
          {taskPieData.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {taskPieData.map((_, i) => (
                      <Cell key={i} fill={TASK_COLORS[i % TASK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-12 text-center">{t('projectDetail.pilotage.chart_no_tasks')}</p>
          )}
          <p className="text-center text-sm font-black text-slate-800 tabular-nums">
            {kpis.tasksTotal > 0
              ? `${kpis.tasksDone} / ${kpis.tasksTotal} (${kpis.progress} %)`
              : `${kpis.progress} %`}
          </p>
        </ChartCard>

        <ChartCard
          title={t('projectDetail.pilotage.risks_title')}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="value"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={22}
                  onClick={(data) => {
                    const row = data as (typeof riskBarData)[0];
                    if (row?.tab) onGoToTab(row.tab, row.section);
                  }}
                  cursor="pointer"
                >
                  {riskBarData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={entry.value > 0 ? RISK_COLORS[i % RISK_COLORS.length] : '#e2e8f0'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {kpis.criticalIncidents > 0 && (
            <p className="text-xs font-medium text-red-600 mt-2 text-center">
              {t('projectDetail.pilotage.critical_count', { count: kpis.criticalIncidents })}
            </p>
          )}
        </ChartCard>
      </div>

      {isDt && kpis.finance && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('projectDetail.pilotage.finance_block')}
            </h4>
            <Link
              to="/kpis"
              className="text-xs font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
            >
              {t('projectDetail.pilotage.full_analysis')}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FinanceItem label={t('projectDetail.pilotage.encaisse')} value={`${formatNumber(kpis.finance.encaisse)} FCFA`} />
            <FinanceItem
              label={t('projectDetail.pilotage.margin')}
              value={kpis.finance.tauxMarge != null ? `${kpis.finance.tauxMarge} %` : '—'}
            />
            <FinanceItem label={t('projectDetail.pilotage.unpaid')} value={`${formatNumber(kpis.finance.impayesTotal)} FCFA`} />
          </dl>
        </div>
      )}

      {hasDelay && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3">
          <CalendarClock className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-900">
            {t('projectDetail.pilotage.delay_notice', { count: kpis.delayDays })}
          </p>
        </div>
      )}

      <p className="text-[11px] text-slate-400">{t('projectDetail.pilotage.daily_hint')}</p>
    </div>
  );
};

function ChartCard({
  title,
  subtitle,
  icon,
  children,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h4 className="text-sm font-black text-slate-900">{title}</h4>
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function FinanceItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-black text-slate-900 mt-1">{value}</dd>
    </div>
  );
}
