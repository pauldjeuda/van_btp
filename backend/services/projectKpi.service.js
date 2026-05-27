const { Op } = require('sequelize');
const db = require('../models');

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

const OPEN_INCIDENT_STATUSES = ['Ouvert', 'En cours de traitement'];
const PENDING_LOGISTICS = ['En attente', 'Erreur envoi'];

function budgetLevel(consumedPct) {
  if (consumedPct > 100) return 'danger';
  if (consumedPct >= 80) return 'warning';
  return 'ok';
}

function computeDelayDays(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

const PRESENT_STATUSES = ['Présent', 'Demi-journée', 'Retard'];

function monthKeyFromDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Derniers N mois calendaires (inclus le mois courant). */
function buildMonthBuckets(count = 8) {
  const buckets = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
    const key = monthKeyFromDate(d);
    buckets.push({ key, label: key });
  }
  return buckets;
}

function plannedProgressAt(project, monthKey) {
  if (!project.startDate || !project.endDate || !monthKey) return null;
  const start = new Date(project.startDate);
  const end = new Date(project.endDate);
  const point = new Date(`${monthKey}-15`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(point.getTime())) {
    return null;
  }
  if (point <= start) return 0;
  if (point >= end) return 100;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  return Math.min(100, Math.round(((point.getTime() - start.getTime()) / total) * 100));
}

function buildEvolutionSeries(project, tx, tasks, attendances) {
  const months = buildMonthBuckets(8);
  const budget = parseFloat(project.budget || project.montantMarche || 0);

  const expensesByMonth = {};
  tx
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const key = monthKeyFromDate(t.transactionDate);
      if (!key) return;
      expensesByMonth[key] = (expensesByMonth[key] || 0) + Math.abs(parseFloat(t.amount || 0));
    });

  const tasksDoneByMonth = {};
  tasks
    .filter((t) => t.status === 'Terminé')
    .forEach((t) => {
      const raw = t.updatedAt || t.createdAt;
      const key = monthKeyFromDate(raw);
      if (!key) return;
      tasksDoneByMonth[key] = (tasksDoneByMonth[key] || 0) + 1;
    });

  const attendanceByMonth = {};
  (attendances || []).forEach((a) => {
    if (!PRESENT_STATUSES.includes(a.status)) return;
    const key = monthKeyFromDate(a.date);
    if (!key) return;
    attendanceByMonth[key] = (attendanceByMonth[key] || 0) + 1;
  });

  let cumulativeExpenses = 0;
  let cumulativeDone = 0;
  const tasksTotal = tasks.length;

  return months.map(({ key, label }) => {
    cumulativeExpenses += expensesByMonth[key] || 0;
    cumulativeDone += tasksDoneByMonth[key] || 0;

    const progressFromTasks =
      tasksTotal > 0 ? Math.min(100, Math.round((cumulativeDone / tasksTotal) * 100)) : null;

    const planned = plannedProgressAt(project, key);
    const actualProgress =
      progressFromTasks != null ? progressFromTasks : parseInt(project.progress, 10) || 0;

    return {
      period: label,
      monthKey: key,
      expenses: Math.round(cumulativeExpenses),
      expensesMonth: Math.round(expensesByMonth[key] || 0),
      budgetConsumedPct: budget > 0 ? Math.min(100, Math.round((cumulativeExpenses / budget) * 100)) : 0,
      progress: actualProgress,
      plannedProgress: planned,
      attendanceDays: attendanceByMonth[key] || 0,
    };
  });
}

function buildTaskBreakdown(tasks) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'Terminé').length;
  const blocked = tasks.filter((t) => t.status === 'Bloqué').length;
  const inProgress = tasks.filter((t) => t.status === 'En cours').length;
  const todo = tasks.filter((t) => t.status === 'À faire').length;
  return { total, done, blocked, inProgress, todo };
}

async function buildProjectKpis(projectId) {
  const project = await db.Project.findByPk(projectId, {
    include: [{ model: db.Transaction, as: 'transactions' }],
  });
  if (!project) return null;

  const today = new Date().toISOString().slice(0, 10);
  const budget = parseFloat(project.budget || project.montantMarche || 0);
  const progress = parseInt(project.progress, 10) || 0;

  const tx = project.transactions || [];
  const expenses = tx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Math.abs(parseFloat(t.amount || 0)), 0);

  const budgetConsumedPct = Math.min(999, pct(expenses, budget));
  const delayDays = computeDelayDays(project.endDate);

  const [
    attendancePresent,
    openIncidents,
    criticalIncidents,
    tasks,
    logisticsPending,
    lastReport,
    reportToday,
    stockCount,
    attendances,
  ] = await Promise.all([
    db.Attendance.count({
      where: { projectId, date: today, status: { [Op.in]: ['Présent', 'Demi-journée', 'Retard'] } },
    }),
    db.Incident.count({
      where: { projectId, status: { [Op.in]: OPEN_INCIDENT_STATUSES } },
    }),
    db.Incident.count({
      where: { projectId, status: { [Op.in]: OPEN_INCIDENT_STATUSES }, gravity: 'Critique' },
    }),
    db.ProjectTask.findAll({ where: { projectId }, attributes: ['id', 'status', 'dueDate', 'progress'] }),
    db.EquipmentRequest.count({
      where: { projectId, status: { [Op.in]: PENDING_LOGISTICS } },
    }),
    db.DailyReport.findOne({
      where: { projectId },
      order: [['reportDate', 'DESC']],
      attributes: ['reportDate'],
    }),
    db.DailyReport.count({ where: { projectId, reportDate: today } }),
    db.StockMovement.count({ where: { projectId } }).catch(() => 0),
    db.Attendance.findAll({
      where: {
        projectId,
        date: {
          [Op.gte]: (() => {
            const d = new Date();
            d.setMonth(d.getMonth() - 8);
            d.setDate(1);
            return d.toISOString().slice(0, 10);
          })(),
        },
      },
      attributes: ['date', 'status'],
      raw: true,
    }),
  ]);

  const tasksTotal = tasks.length;
  const tasksDone = tasks.filter((t) => t.status === 'Terminé').length;
  const tasksBlocked = tasks.filter((t) => t.status === 'Bloqué').length;
  const tasksOverdue = tasks.filter((t) => {
    if (t.status === 'Terminé' || !t.dueDate) return false;
    return String(t.dueDate) < today;
  }).length;

  let reportStaleDays = null;
  if (lastReport?.reportDate) {
    const last = new Date(lastReport.reportDate);
    const now = new Date(today);
    reportStaleDays = Math.max(0, Math.ceil((now - last) / (1000 * 60 * 60 * 24)));
  } else {
    reportStaleDays = null;
  }

  const encaisse = tx
    .filter((t) => t.type === 'invoice' && t.status === 'Payé')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const tauxMarge = encaisse > 0 ? pct(encaisse - expenses, encaisse) : null;
  const impayesTotal = tx
    .filter((t) => t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté')
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  const evolution = buildEvolutionSeries(project, tx, tasks, attendances);
  const taskBreakdown = buildTaskBreakdown(tasks);

  return {
    projectId: project.id,
    progress,
    budget,
    expenses,
    budgetConsumedPct,
    budgetConsumedLevel: budgetLevel(budgetConsumedPct),
    delayDays,
    attendanceToday: attendancePresent,
    openIncidents,
    criticalIncidents,
    tasksTotal,
    tasksDone,
    tasksBlocked,
    tasksOverdue,
    logisticsPending,
    lastReportDate: lastReport?.reportDate || null,
    reportToday: reportToday > 0,
    reportStaleDays,
    stockMovementsCount: stockCount,
    finance: {
      encaisse,
      tauxMarge,
      impayesTotal,
      depenses: expenses,
    },
    evolution,
    taskBreakdown,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { buildProjectKpis, budgetLevel, buildEvolutionSeries };
