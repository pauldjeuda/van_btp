const db = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest } = require('../utils/response');

const SUBCONTRACT_INCLUDE = [{
  model: db.SubcontractTask,
  as: 'tasks',
}];

const logAction = (action, entityId, req) =>
  db.Log.create({
    action, module: 'Sous-traitance', entityType: 'Subcontract', entityId,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;

  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    if (!req.query.projectId) where.projectId = projects.map(p => p.id);
  }

  const subcontracts = await db.Subcontract.findAll({
    where,
    include: SUBCONTRACT_INCLUDE,
    order: [['createdAt', 'DESC']],
  });
  return success(res, subcontracts);
});

exports.getById = asyncHandler(async (req, res) => {
  const sub = await db.Subcontract.findByPk(req.params.id, { include: SUBCONTRACT_INCLUDE });
  if (!sub) return notFound(res, 'Sous-traitant introuvable');
  return success(res, sub);
});

exports.create = asyncHandler(async (req, res) => {
  const { entreprise, projectId } = req.body;
  if (!entreprise || !projectId) return badRequest(res, 'Le nom et le projet sont obligatoires');

  const sub = await db.Subcontract.create(req.body);
  if (req.body.tasks?.length) {
    await db.SubcontractTask.bulkCreate(
      req.body.tasks.map((t) => ({ ...t, subcontractId: sub.id }))
    );
  }
  await logAction(`Sous-traitant créé : ${entreprise}`, sub.id, req);
  return created(res, await db.Subcontract.findByPk(sub.id, { include: SUBCONTRACT_INCLUDE }), 'Sous-traitant créé');
});

exports.update = asyncHandler(async (req, res) => {
  const sub = await db.Subcontract.findByPk(req.params.id, { include: SUBCONTRACT_INCLUDE });
  if (!sub) return notFound(res, 'Sous-traitant introuvable');
  await sub.update(req.body);
  if (req.body.tasks) {
    await db.SubcontractTask.destroy({ where: { subcontractId: sub.id }, force: true });
    if (req.body.tasks.length) {
      await db.SubcontractTask.bulkCreate(
        req.body.tasks.map((t) => {
          const { id, createdAt, updatedAt, deletedAt, ...rest } = t;
          return { ...rest, subcontractId: sub.id };
        })
      );
    }
  }
  return success(res, await db.Subcontract.findByPk(sub.id, { include: SUBCONTRACT_INCLUDE }), 'Sous-traitant mis à jour');
});

exports.toggleTask = asyncHandler(async (req, res) => {
  const task = await db.SubcontractTask.findOne({
    where: { id: req.params.taskId, subcontractId: req.params.id },
  });
  if (!task) return notFound(res, 'Tâche introuvable');
  await task.update({ completed: !task.completed });

  const allTasks = await db.SubcontractTask.findAll({ where: { subcontractId: req.params.id } });
  const completedCount = allTasks.filter(t => t.completed).length;
  const progress = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;
  
  const sub = await db.Subcontract.findByPk(req.params.id);
  await sub.update({ progress });

  return success(res, await db.Subcontract.findByPk(sub.id, { include: SUBCONTRACT_INCLUDE }), 'Tâche mise à jour');
});

exports.remove = asyncHandler(async (req, res) => {
  const sub = await db.Subcontract.findByPk(req.params.id);
  if (!sub) return notFound(res, 'Sous-traitant introuvable');
  await sub.destroy();
  return success(res, null, 'Sous-traitant supprimé');
});
