const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, badRequest, error } = require('../utils/response');
const { ROLE_DG, ROLE_CHEF } = require('../utils/roles');

function normalizeLines(lines) {
  if (!Array.isArray(lines) || !lines.length) return null;
  const normalized = lines
    .map((line) => {
      const designation = String(line.designation || '').trim();
      if (!designation) return null;
      const unitPrice = Number(line.unitPrice ?? line.price ?? 0);
      const quantityRaw = line.quantity;
      const quantity = quantityRaw != null && quantityRaw !== '' ? Number(quantityRaw) : 1;
      const qty = quantity > 0 ? quantity : 1;
      const total = Math.round(unitPrice * qty * 100) / 100;
      return { designation, unitPrice, quantity: qty, total };
    })
    .filter(Boolean);
  return normalized.length ? normalized : null;
}

function sumLines(lines) {
  return lines.reduce((acc, l) => acc + Number(l.total || 0), 0);
}

function parseStoredLines(raw) {
  if (raw == null) return [];
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

function serializeQuote(quote) {
  const plain = quote?.toJSON ? quote.toJSON() : { ...quote };
  return {
    ...plain,
    lines: parseStoredLines(plain.lines),
    totalAmount: Number(plain.totalAmount || 0),
  };
}

async function assertProjectAccess(req, projectId) {
  const project = await db.Project.findByPk(projectId);
  if (!project) return { ok: false, code: 404, message: 'Projet introuvable' };
  if (req.role === ROLE_CHEF && project.chefId !== req.user.id) {
    return { ok: false, code: 403, message: 'Accès refusé à ce chantier' };
  }
  return { ok: true, project };
}

async function notifyDtNewQuote(quote, project, req) {
  const linesSummary = (quote.lines || [])
    .slice(0, 5)
    .map((l) => `• ${l.designation} — ${Number(l.total).toLocaleString('fr-FR')} FCFA`)
    .join('\n');

  await db.Ticket.create({
    title: `[DEVIS] ${project.name} — ${Number(quote.totalAmount).toLocaleString('fr-FR')} FCFA`,
    module: 'Projets',
    priority: 'Haute',
    status: 'Ouvert',
    description: [
      `Chantier : ${project.name} (${project.code || project.id})`,
      `Devis soumis par : ${req.user?.prenom || ''} ${req.user?.nom || ''}`.trim(),
      `Total : ${Number(quote.totalAmount).toLocaleString('fr-FR')} FCFA`,
      linesSummary,
    ].filter(Boolean).join('\n'),
    createdBy: req.user?.id,
    createdByRole: req.role,
  }).catch(() => {});

  await db.Log.create({
    action: `Devis chantier soumis — ${project.name}`,
    module: 'Projets',
    entityType: 'ProjectQuote',
    entityId: quote.id,
    userId: req.user?.id,
    userRole: req.role,
    userMatricule: req.user?.matricule,
  }).catch(() => {});
}

exports.getAll = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return error(res, access.message, access.code);
  }
  const rows = await db.ProjectQuote.findAll({
    where: { projectId },
    order: [['createdAt', 'DESC']],
  });
  return success(res, rows.map(serializeQuote));
});

exports.getOne = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return error(res, access.message, access.code);
  }
  const quote = await db.ProjectQuote.findOne({
    where: { id: req.params.quoteId, projectId },
  });
  if (!quote) return notFound(res, 'Devis introuvable');
  return success(res, serializeQuote(quote));
});

exports.create = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return error(res, access.message, access.code);
  }

  const lines = normalizeLines(req.body.lines);
  if (!lines) return badRequest(res, 'Au moins une ligne valide est requise (désignation + prix)');

  const totalAmount = sumLines(lines);
  const isChef = req.role === ROLE_CHEF;
  const status = isChef ? 'En attente' : 'Validé';

  const quote = await db.ProjectQuote.create({
    projectId,
    title: String(req.body.title || 'Devis chantier').trim() || 'Devis chantier',
    lines,
    totalAmount,
    status,
    createdBy: req.user.id,
    createdByRole: req.role,
    reviewedBy: isChef ? null : req.user.id,
  });

  if (isChef) {
    await notifyDtNewQuote(quote, access.project, req);
  }

  await quote.reload();
  return created(res, serializeQuote(quote), isChef ? 'Devis soumis — en attente de validation DT' : 'Devis enregistré');
});

exports.update = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return error(res, access.message, access.code);
  }

  const quote = await db.ProjectQuote.findOne({
    where: { id: req.params.quoteId, projectId },
  });
  if (!quote) return notFound(res, 'Devis introuvable');

  const isDt = req.role === ROLE_DG;
  const isChef = req.role === ROLE_CHEF;
  const isCreator = Number(quote.createdBy) === Number(req.user.id);
  const isResubmit = quote.status === 'Rejeté' && isChef && isCreator;
  const isPendingEdit = quote.status === 'En attente';

  if (!isPendingEdit && !isResubmit) {
    return badRequest(res, 'Ce devis ne peut plus être modifié');
  }
  if (isPendingEdit && !isDt && !isCreator) {
    return error(res, 'Modification non autorisée', 403);
  }

  const lines = normalizeLines(req.body.lines ?? quote.lines);
  if (!lines) return badRequest(res, 'Au moins une ligne valide est requise');

  const payload = {
    lines,
    totalAmount: sumLines(lines),
  };
  if (req.body.title) payload.title = String(req.body.title).trim() || quote.title;

  if (isResubmit) {
    payload.status = 'En attente';
    payload.rejectionReason = null;
    payload.reviewedBy = null;
  }

  await quote.update(payload);
  await quote.reload();

  if (isResubmit) {
    await notifyDtNewQuote(quote, access.project, req);
    return success(res, serializeQuote(quote), 'Devis corrigé et renvoyé au directeur technique');
  }

  return success(res, serializeQuote(quote), 'Devis mis à jour');
});

exports.approve = asyncHandler(async (req, res) => {
  if (req.role !== ROLE_DG) return error(res, 'Seul le directeur technique peut valider', 403);

  const projectId = Number(req.params.projectId);
  const quote = await db.ProjectQuote.findOne({
    where: { id: req.params.quoteId, projectId },
    include: [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }],
  });
  if (!quote) return notFound(res, 'Devis introuvable');
  if (quote.status !== 'En attente') return badRequest(res, 'Devis déjà traité');

  if (req.body.lines) {
    const lines = normalizeLines(req.body.lines);
    if (lines) {
      await quote.update({
        lines,
        totalAmount: sumLines(lines),
        title: req.body.title ? String(req.body.title).trim() : quote.title,
      });
    }
  }

  await quote.update({
    status: 'Validé',
    reviewedBy: req.user.id,
    rejectionReason: null,
  });

  await db.Log.create({
    action: `Devis chantier validé — ${quote.project?.name || projectId}`,
    module: 'Projets',
    entityType: 'ProjectQuote',
    entityId: quote.id,
    userId: req.user.id,
    userRole: req.role,
    userMatricule: req.user.matricule,
  }).catch(() => {});

  await quote.reload();
  return success(res, serializeQuote(quote), 'Devis validé');
});

exports.reject = asyncHandler(async (req, res) => {
  if (req.role !== ROLE_DG) return error(res, 'Seul le directeur technique peut rejeter', 403);

  const projectId = Number(req.params.projectId);
  const quote = await db.ProjectQuote.findOne({
    where: { id: req.params.quoteId, projectId },
  });
  if (!quote) return notFound(res, 'Devis introuvable');
  if (quote.status !== 'En attente') return badRequest(res, 'Devis déjà traité');

  await quote.update({
    status: 'Rejeté',
    reviewedBy: req.user.id,
    rejectionReason: String(req.body.reason || req.body.rejectionReason || '').trim() || null,
  });

  await quote.reload();
  return success(res, serializeQuote(quote), 'Devis rejeté');
});

exports.remove = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.projectId);
  const access = await assertProjectAccess(req, projectId);
  if (!access.ok) {
    if (access.code === 404) return notFound(res, access.message);
    return error(res, access.message, access.code);
  }

  const quote = await db.ProjectQuote.findOne({
    where: { id: req.params.quoteId, projectId },
  });
  if (!quote) return notFound(res, 'Devis introuvable');
  if (quote.status === 'Validé') return badRequest(res, 'Impossible de supprimer un devis validé');

  const isDt = req.role === ROLE_DG;
  const isCreator = quote.createdBy === req.user.id;
  if (!isDt && !isCreator) return error(res, 'Suppression non autorisée', 403);

  await quote.destroy();
  return success(res, null, 'Devis supprimé');
});
