const { Op }       = require('sequelize');
const db           = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success }  = require('../utils/response');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sumBy = (arr, key) =>
  arr.reduce((s, item) => s + parseFloat(item[key] || 0), 0);

const filterBy = (arr, key, val) =>
  arr.filter(item => item[key] === val);

// ─── Controller ───────────────────────────────────────────────────────────────

exports.getKPIs = asyncHandler(async (req, res) => {
  const { role, user } = req;

  const projectWhere = {};
  if (role === 'Chef_chantier') projectWhere.chefId = user.id;

  // ── Projets ────────────────────────────────────────────────────────────────
  const projects    = await db.Project.findAll({ where: projectWhere });
  const projectIds  = projects.map(p => p.id);
  const budgetTotal = sumBy(projects, 'budget');

  const projectStats = {
    total:               projects.length,
    enCours:             filterBy(projects, 'status', 'En cours').length,
    termines:            filterBy(projects, 'status', 'Terminé').length,
    planifies:           filterBy(projects, 'status', 'Planifié').length,
    suspendus:           filterBy(projects, 'status', 'Suspendu').length,
    budgetTotal,
    progressionMoyenne:  projects.length
      ? Math.round(sumBy(projects, 'progress') / projects.length)
      : 0,
  };

  // ── Finances ───────────────────────────────────────────────────────────────
  const transactions = await db.Transaction.findAll({ where: { projectId: projectIds } });
  const depenses     = filterBy(transactions, 'type', 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const factures     = filterBy(transactions, 'type', 'invoice').reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  const financeStats = {
    totalDepenses:    depenses,
    totalFactures:    factures,
    solde:            factures - depenses,
    tauxConsommation: budgetTotal ? Math.round((depenses / budgetTotal) * 100) : 0,
  };

  // ── Personnel ──────────────────────────────────────────────────────────────
  const employees = await db.Employee.findAll({
    where:   { projectId: projectIds },
    include: [{ model: db.Project, as: 'currentProject', attributes: ['id', 'name'] }],
  });

  const employeeStats = {
    total:     employees.length,
    actifs:    employees.filter(e => e.actif !== false).length,
    parProjet: projectIds.map(id => ({
      projectId:   id,
      projectName: projects.find(p => p.id === id)?.name || 'Inconnu',
      count:       employees.filter(e => e.projectId === id).length,
    })),
  };

  // ── Incidents ──────────────────────────────────────────────────────────────
  const incidents = await db.Incident.findAll({ where: { projectId: projectIds } });

  const incidentStats = {
    total:   incidents.length,
    ouverts: filterBy(incidents, 'status', 'Ouvert').length,
    graves:  incidents.filter(i => ['Grave', 'Critique'].includes(i.gravity)).length,
    hse:     filterBy(incidents, 'category', 'hse').length,
    quality: filterBy(incidents, 'category', 'quality').length,
  };

  // ── Logs récents ───────────────────────────────────────────────────────────
  const recentLogs = await db.Log.findAll({
    where: role !== 'Directeur_technique' ? { userId: user.id } : {},
    order: [['createdAt', 'DESC']],
    limit: 10,
  });

  return success(res, {
    role,
    projects:       projectStats,
    finances:       financeStats,
    personnel:      employeeStats,
    incidents:      incidentStats,
    recentActivity: recentLogs,
  });
});
