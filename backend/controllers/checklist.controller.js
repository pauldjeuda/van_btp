const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  const checklists = await db.Checklist.findAll({
    where,
    include: [
      { model: db.ChecklistTask, as: 'tasks' },
      { model: db.Project, as: 'project', attributes: ['id', 'name'] },
    ],
    order: [['createdAt', 'DESC']],
  });
  return success(res, checklists);
});

exports.create = asyncHandler(async (req, res) => {
  const { title, projectId } = req.body;
  if (!title || !projectId) return badRequest(res, 'Titre et projet sont obligatoires');
  const checklist = await db.Checklist.create({ ...req.body, createdBy: req.user.id });
  if (req.body.tasks && Array.isArray(req.body.tasks)) {
    await Promise.all(req.body.tasks.map(t =>
      db.ChecklistTask.create({ title: t.title, checklistId: checklist.id })
    ));
  }
  const result = await db.Checklist.findByPk(checklist.id, {
    include: [{ model: db.ChecklistTask, as: 'tasks' }],
  });
  return created(res, result, 'Checklist créée');
});

exports.update = asyncHandler(async (req, res) => {
  const checklist = await db.Checklist.findByPk(req.params.id);
  if (!checklist) return notFound(res, 'Checklist introuvable');
  await checklist.update(req.body);
  return success(res, checklist, 'Checklist mise à jour');
});

exports.toggleTask = asyncHandler(async (req, res) => {
  const task = await db.ChecklistTask.findOne({
    where: { id: req.params.taskId, checklistId: req.params.id },
  });
  if (!task) return notFound(res, 'Tâche introuvable');
  await task.update({
    completed: !task.completed,
    completedAt: !task.completed ? new Date() : null,
    completedBy: !task.completed ? req.user.id : null,
  });
  return success(res, task, 'Tâche mise à jour');
});

exports.remove = asyncHandler(async (req, res) => {
  const checklist = await db.Checklist.findByPk(req.params.id);
  if (!checklist) return notFound(res, 'Checklist introuvable');
  await checklist.destroy();
  return success(res, null, 'Checklist supprimée');
});
