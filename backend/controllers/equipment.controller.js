const db           = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest } = require('../utils/response');

const logAction = (action, entityId, req) =>
  db.Log.create({
    action, module: 'Ressources', entityType: 'Equipment', entityId,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });

const PROJECT_INCLUDE = [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }];

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.status)    where.status    = req.query.status;

  if (req.role === 'Chef_chantier' && !req.query.projectId) {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    where.projectId = projects.map(p => p.id);
  }

  const equipment = await db.Equipment.findAll({
    where,
    include: PROJECT_INCLUDE,
    order: [['name', 'ASC']],
  });
  return success(res, equipment);
});

exports.getById = asyncHandler(async (req, res) => {
  const eq = await db.Equipment.findByPk(req.params.id, { include: PROJECT_INCLUDE });
  if (!eq) return notFound(res, 'Engin introuvable');
  return success(res, eq);
});

exports.create = asyncHandler(async (req, res) => {
  const { name, ref } = req.body;
  if (!name) return badRequest(res, "Le nom de l'engin est obligatoire");
  const eq = await db.Equipment.create(req.body);
  await logAction(`Ajout de l'engin : ${name} (${ref || 'sans ref'})`, eq.id, req);
  return created(res, eq, 'Engin ajouté avec succès');
});

exports.update = asyncHandler(async (req, res) => {
  const eq = await db.Equipment.findByPk(req.params.id);
  if (!eq) return notFound(res, 'Engin introuvable');
  await eq.update(req.body);
  return success(res, eq, 'Engin mis à jour');
});

exports.remove = asyncHandler(async (req, res) => {
  const eq = await db.Equipment.findByPk(req.params.id);
  if (!eq) return notFound(res, 'Engin introuvable');
  await eq.destroy();
  return success(res, null, 'Engin supprimé');
});
