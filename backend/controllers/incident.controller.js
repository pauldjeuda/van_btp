const asyncHandler = require('../middlewares/asyncHandler');
const path = require('path');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.category) where.category = req.query.category;
  if (req.query.status) where.status = req.query.status;
  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    if (!req.query.projectId) where.projectId = projects.map(p => p.id);
  }
  if (req.role === 'Technicien_chantier') {
    const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule } });
    if (emp?.projectId) where.projectId = emp.projectId;
  }
  const incidents = await db.Incident.findAll({
    where,
    include: [
      { model: db.Project, as: 'project', attributes: ['id', 'name'] },
      { model: db.IncidentHistory, as: 'history', order: [['createdAt', 'ASC']] },
    ],
    order: [['incidentDate', 'DESC']],
  });
  return success(res, incidents);
});

exports.getById = asyncHandler(async (req, res) => {
  const incident = await db.Incident.findByPk(req.params.id, {
    include: [
      { model: db.Project, as: 'project', attributes: ['id', 'name'] },
      { model: db.IncidentHistory, as: 'history' },
    ],
  });
  if (!incident) return notFound(res, 'Incident introuvable');
  return success(res, incident);
});

exports.create = asyncHandler(async (req, res) => {
  const { title, category, projectId, incidentDate } = req.body;
  if (!title || !category || !projectId || !incidentDate) {
    return badRequest(res, 'Titre, catégorie, projet et date sont obligatoires');
  }
  const imageUrl = req.file ? `/uploads/incidents/${req.file.filename}` : null;
  const incident = await db.Incident.create({
    ...req.body, imageUrl, reporterId: req.user.id,
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
  return created(res, incident, 'Incident déclaré avec succès');
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
  return success(res, incident, 'Incident mis à jour');
});
