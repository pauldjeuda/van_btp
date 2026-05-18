const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const tasks = await db.ProjectTask.findAll({
      where: { projectId },
      include: [{ model: db.Employee, as: 'assignee', attributes: ['id', 'name', 'matricule', 'role'] }],
      order: [['priority', 'DESC'], ['dueDate', 'ASC']],
    });
    return success(res, tasks);
});

exports.create = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { title } = req.body;
    if (!title) return badRequest(res, 'Le titre est obligatoire');
    const task = await db.ProjectTask.create({ ...req.body, projectId, createdBy: req.user.id });
    await db.Log.create({
      action: `Tâche créée : ${title}`, module: 'Projets',
      entityType: 'ProjectTask', entityId: task.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    const full = await db.ProjectTask.findByPk(task.id, {
      include: [{ model: db.Employee, as: 'assignee', attributes: ['id', 'name', 'matricule'] }],
    });
    return created(res, full, 'Tâche créée');
});

exports.update = asyncHandler(async (req, res) => {
    const task = await db.ProjectTask.findByPk(req.params.taskId);
    if (!task) return notFound(res, 'Tâche introuvable');
    await task.update(req.body);
    // Recalculer avancement du projet
    await _recalcProjectProgress(task.projectId);
    const full = await db.ProjectTask.findByPk(task.id, {
      include: [{ model: db.Employee, as: 'assignee', attributes: ['id', 'name', 'matricule'] }],
    });
    return success(res, full, 'Tâche mise à jour');
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const task = await db.ProjectTask.findByPk(req.params.taskId);
    if (!task) return notFound(res, 'Tâche introuvable');
    const { status, progress } = req.body;
    const autoProgress = { 'À faire': 0, 'En cours': 50, 'Terminé': 100, 'Bloqué': task.progress };
    await task.update({
      status,
      progress: progress !== undefined ? progress : (autoProgress[status] ?? task.progress),
    });
    await _recalcProjectProgress(task.projectId);
    return success(res, task, 'Statut mis à jour');
});

exports.remove = asyncHandler(async (req, res) => {
    const task = await db.ProjectTask.findByPk(req.params.taskId);
    if (!task) return notFound(res, 'Tâche introuvable');
    const { projectId } = task;
    await task.destroy();
    await _recalcProjectProgress(projectId);
    return success(res, null, 'Tâche supprimée');
});

// Recalcule la progression globale du projet à partir de ses tâches
async function _recalcProjectProgress(projectId) {
  const tasks = await db.ProjectTask.findAll({ where: { projectId } });
  if (!tasks.length) return;
  const avg = Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / tasks.length);
  await db.Project.update({ progress: avg }, { where: { id: projectId } });
}
