const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, badRequest } = require('../utils/response');

async function assertProjectAccess(req, projectId) {
  const project = await db.Project.findByPk(projectId);
  if (!project) return { ok: false, code: 404, message: 'Projet introuvable' };
  if (req.role === 'Chef_chantier' && project.chefId !== req.user.id) {
    return { ok: false, code: 403, message: 'Accès refusé à ce chantier' };
  }
  return { ok: true, project };
}

exports.getAll = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return badRequest(res, access.message);
  }
  const rows = await db.ProjectFixedCost.findAll({
    where: { projectId },
    order: [['type', 'ASC'], ['createdAt', 'DESC']],
  });
  return success(res, rows);
});

exports.create = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return badRequest(res, access.message);
  }

  const { type, label, amount, period, notes } = req.body;
  if (amount === undefined || amount === null || Number(amount) < 0) {
    return badRequest(res, 'Montant invalide');
  }

  const row = await db.ProjectFixedCost.create({
    projectId,
    type: type || 'Autre',
    label: label?.trim() || null,
    amount: Number(amount),
    period: period || 'Mensuel',
    notes: notes?.trim() || null,
    createdBy: req.user.id,
  });

  await db.Log.create({
    action: `Charge fixe ajoutée (${row.type}) — ${Number(row.amount).toLocaleString('fr-FR')} FCFA`,
    module: 'Projets',
    entityType: 'ProjectFixedCost',
    entityId: row.id,
    userId: req.user.id,
    userRole: req.role,
    userMatricule: req.user.matricule,
  }).catch(() => {});

  return created(res, row, 'Charge fixe enregistrée');
});

exports.update = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return badRequest(res, access.message);
  }

  const row = await db.ProjectFixedCost.findOne({
    where: { id: req.params.costId, projectId },
  });
  if (!row) return notFound(res, 'Charge introuvable');

  const { type, label, amount, period, notes } = req.body;
  await row.update({
    ...(type !== undefined && { type }),
    ...(label !== undefined && { label: label?.trim() || null }),
    ...(amount !== undefined && { amount: Number(amount) }),
    ...(period !== undefined && { period }),
    ...(notes !== undefined && { notes: notes?.trim() || null }),
  });

  return success(res, row, 'Charge mise à jour');
});

exports.remove = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return badRequest(res, access.message);
  }

  const row = await db.ProjectFixedCost.findOne({
    where: { id: req.params.costId, projectId },
  });
  if (!row) return notFound(res, 'Charge introuvable');
  await row.destroy();
  return success(res, null, 'Charge supprimée');
});

/** Convertit une charge en équivalent journalier pour le calcul des coûts chantier. */
exports.dailyEquivalent = (row) => {
  const amount = parseFloat(row.amount) || 0;
  switch (row.period) {
    case 'Journalier': return amount;
    case 'Hebdomadaire': return amount / 7;
    case 'Mensuel': return amount / 30;
    case 'Ponctuel': return 0;
    default: return amount / 30;
  }
};

exports.getCostSummary = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return badRequest(res, access.message);
  }

  const rows = await db.ProjectFixedCost.findAll({ where: { projectId } });
  const dailyFromFixed = rows.reduce((s, r) => s + exports.dailyEquivalent(r), 0);
  const weeklyFromFixed = dailyFromFixed * 7;
  const totalFixed = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  return success(res, {
    fixedCostsCount: rows.length,
    totalFixedAmount: Math.round(totalFixed),
    dailyCost: Math.round(dailyFromFixed),
    weeklyCost: Math.round(weeklyFromFixed),
  });
});
