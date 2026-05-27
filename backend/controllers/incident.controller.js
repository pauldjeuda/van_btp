const asyncHandler = require('../middlewares/asyncHandler');
const path = require('path');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');
const {
  displayNameFromTokenUser,
  enrichIncidentWithReporter,
  enrichIncidentsWithReporter,
} = require('../utils/resolveUserDisplayName');
const { normalizeGravity, parseProjectId, serializeIncidentForApi } = require('../utils/incidentHelpers');

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.category) where.category = req.query.category;
  if (req.query.status) where.status = req.query.status;
  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    if (!req.query.projectId) where.projectId = projects.map(p => p.id);
  }
  const incidents = await db.Incident.findAll({
    where,
    include: [
      { model: db.Project, as: 'project', attributes: ['id', 'name'] },
      { model: db.IncidentHistory, as: 'history', order: [['createdAt', 'ASC']] },
    ],
    order: [['incidentDate', 'DESC']],
  });
  const enriched = await enrichIncidentsWithReporter(incidents);
  return success(res, enriched);
});

exports.getById = asyncHandler(async (req, res) => {
  const incident = await db.Incident.findByPk(req.params.id, {
    include: [
      { model: db.Project, as: 'project', attributes: ['id', 'name'] },
      { model: db.IncidentHistory, as: 'history' },
    ],
  });
  if (!incident) return notFound(res, 'Incident introuvable');
  const enriched = await enrichIncidentWithReporter(incident);
  return success(res, enriched);
});

exports.create = asyncHandler(async (req, res) => {
  const { title, category, incidentDate } = req.body;
  const projectId = parseProjectId(req.body.projectId);
  if (!title || !category || !projectId || !incidentDate) {
    return badRequest(res, 'Titre, catégorie, chantier et date sont obligatoires');
  }

  const project = await db.Project.findByPk(projectId);
  if (!project) return notFound(res, 'Chantier introuvable');

  if (req.role === 'Chef_chantier' && Number(project.chefId) !== Number(req.user.id)) {
    return error(res, 'Vous ne pouvez déclarer un incident que sur vos chantiers', 403);
  }

  const files = req.files?.length ? req.files : (req.file ? [req.file] : []);
  const imagePaths = files.map((f) => `/uploads/incidents/${f.filename}`);
  const imageUrl = imagePaths[0] || null;
  const images = imagePaths;

  const incident = await db.Incident.create({
    title: String(title).trim(),
    type: req.body.type || null,
    category,
    gravity: normalizeGravity(req.body.gravity),
    description: req.body.description || null,
    status: req.body.status || 'Ouvert',
    actionPlan: req.body.actionPlan || null,
    impact: req.body.impact || null,
    incidentDate,
    projectId,
    imageUrl,
    images,
    reporterId: req.user.id,
  });
  await db.IncidentHistory.create({
    action: 'Déclaration de l\'incident',
    incidentId: incident.id,
    userId: req.user.id, userRole: req.role,
  });
  await db.Log.create({
    action: `Incident déclaré : ${title}`,
    module: 'Contrôle', entityType: 'Incident', entityId: incident.id,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });
  const withReporter = serializeIncidentForApi({
    ...incident.toJSON(),
    images: incident.images || images,
    reporter: displayNameFromTokenUser(req.user),
    history: [{
      action: 'Déclaration de l\'incident',
      incidentId: incident.id,
      userId: req.user.id,
      userRole: req.role,
    }],
  });
  return created(res, withReporter, 'Incident déclaré avec succès');
});

exports.update = asyncHandler(async (req, res) => {
  const incident = await db.Incident.findByPk(req.params.id);
  if (!incident) return notFound(res, 'Incident introuvable');
  const oldStatus = incident.status;
  await incident.update(req.body);
  if (req.body.status && req.body.status !== oldStatus) {
    await db.IncidentHistory.create({
      action: `Statut changé : ${oldStatus} → ${req.body.status}`,
      note: req.body.note || null,
      incidentId: incident.id,
      userId: req.user.id, userRole: req.role,
    });
  }
  const reloaded = await db.Incident.findByPk(incident.id, {
    include: [
      { model: db.Project, as: 'project', attributes: ['id', 'name'] },
      { model: db.IncidentHistory, as: 'history', order: [['createdAt', 'ASC']] },
    ],
  });
  const enriched = await enrichIncidentWithReporter(reloaded);
  return success(res, enriched, 'Incident mis à jour');
});
