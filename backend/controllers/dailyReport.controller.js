const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.role === 'Technicien_chantier') {
    const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule } });
    if (emp?.projectId) where.projectId = emp.projectId;
    where.reporterId = req.user.id;
  }
  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    if (!req.query.projectId) where.projectId = projects.map(p => p.id);
  }
  const reports = await db.DailyReport.findAll({
    where,
    include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
    order: [['reportDate', 'DESC']],
  });
  return success(res, reports);
});

exports.create = asyncHandler(async (req, res) => {
  const { projectId, reportDate } = req.body;
  if (!projectId || !reportDate) {
    return badRequest(res, 'Projet et date du rapport sont obligatoires');
  }
  const report = await db.DailyReport.create({
    ...req.body,
    reporterId: req.user.id,
    reporter: req.body.reporter || req.user.name || req.user.email || 'Utilisateur',
  });
  await db.Log.create({
    action: `Rapport journalier créé pour le ${reportDate}`,
    module: 'Projets', entityType: 'DailyReport', entityId: report.id,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });
  return created(res, report, 'Rapport journalier soumis');
});

exports.update = asyncHandler(async (req, res) => {
  const report = await db.DailyReport.findByPk(req.params.id);
  if (!report) return notFound(res, 'Rapport introuvable');
  // Seul l'auteur ou un chef peut modifier
  if (req.role === 'Technicien_chantier' && report.reporterId !== req.user.id) {
    return error(res, 'Vous ne pouvez modifier que vos propres rapports', 403);
  }
  await report.update(req.body);
  return success(res, report, 'Rapport mis à jour');
});
