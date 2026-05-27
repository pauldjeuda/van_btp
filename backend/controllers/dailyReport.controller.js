const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

const parseImages = (raw) => {
  let images = raw;
  if (typeof images === 'string') {
    try { images = JSON.parse(images); } catch { images = []; }
  }
  if (!Array.isArray(images)) return [];
  return images
    .filter((img) => typeof img === 'string' && img.startsWith('data:image/'))
    .slice(0, 10);
};

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;

  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    const ids = projects.map((p) => p.id);
    if (!ids.length) return success(res, []);
    if (req.query.projectId) {
      if (!ids.includes(Number(req.query.projectId))) {
        return error(res, 'Accès refusé à ce chantier', 403);
      }
    } else {
      where.projectId = ids;
    }
  }

  const reports = await db.DailyReport.findAll({
    where,
    include: [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }],
    order: [['reportDate', 'DESC']],
  });
  return success(res, reports);
});

exports.create = asyncHandler(async (req, res) => {
  const { projectId, reportDate } = req.body;
  if (!projectId || !reportDate) {
    return badRequest(res, 'Projet et date du rapport sont obligatoires');
  }

  const project = await db.Project.findByPk(projectId);
  if (!project) return notFound(res, 'Chantier introuvable');
  if (req.role === 'Chef_chantier' && Number(project.chefId) !== Number(req.user.id)) {
    return error(res, 'Vous ne pouvez rédiger un rapport que pour vos chantiers', 403);
  }

  const images = parseImages(req.body.images);
  const report = await db.DailyReport.create({
    projectId,
    reportDate,
    workDone: req.body.workDone || '',
    issuesEncountered: req.body.issuesEncountered || '',
    nextDayPlan: req.body.nextDayPlan || '',
    workerCount: Number(req.body.workerCount || 0),
    status: 'Soumis',
    images,
    reporterId: req.user.id,
    reporter: req.body.reporter
      || `${req.user.prenom || ''} ${req.user.nom || ''}`.trim()
      || req.user.email
      || 'Utilisateur',
  });

  await db.Log.create({
    action: `Rapport chantier soumis au directeur — ${reportDate}`,
    module: 'Projets',
    entityType: 'DailyReport',
    entityId: report.id,
    userId: req.user.id,
    userRole: req.role,
    userMatricule: req.user.matricule,
  });

  return created(res, report, 'Rapport transmis au directeur technique');
});

exports.update = asyncHandler(async (req, res) => {
  const report = await db.DailyReport.findByPk(req.params.id);
  if (!report) return notFound(res, 'Rapport introuvable');
  if (
    req.role === 'Chef_chantier'
    && Number(report.reporterId) !== Number(req.user.id)
  ) {
    return error(res, 'Modification non autorisée', 403);
  }

  const updates = { ...req.body };
  if (updates.images !== undefined) updates.images = parseImages(updates.images);
  await report.update(updates);
  return success(res, report, 'Rapport mis à jour');
});
