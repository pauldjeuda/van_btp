const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');
const { computeStageFromTasks, computeProgressFromTasks } = require('../utils/advancementStage');

exports.getAll = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const tasks = await db.ProjectTask.findAll({
      where: { projectId },
      include: [{ model: db.Employee, as: 'assignee', attributes: ['id', 'name', 'matricule', 'role'] }],
      order: [['position', 'ASC'], ['id', 'ASC']],
    });
    return success(res, tasks);
});

exports.create = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { title } = req.body;
    if (!title) return badRequest(res, 'Le titre est obligatoire');

    const count = await db.ProjectTask.count({ where: { projectId } });
    const task = await db.ProjectTask.create({
      ...req.body,
      projectId,
      position: req.body.position ?? count,
      createdBy: req.user.id,
    });

    await _recalcProjectProgress(projectId);

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

    const nextStatus = req.body.status ?? task.status;
    if (nextStatus === 'Bloqué' && !String(req.body.blockedReason || task.blockedReason || '').trim()) {
      return badRequest(res, 'Une explication est obligatoire pour une tâche bloquée');
    }

    const wasBlocked = task.status === 'Bloqué';
    await task.update(req.body);

    if (nextStatus === 'Bloqué' && !wasBlocked) {
      await _notifyBlockedTask(task, req);
    }

    await _recalcProjectProgress(task.projectId);
    const full = await db.ProjectTask.findByPk(task.id, {
      include: [{ model: db.Employee, as: 'assignee', attributes: ['id', 'name', 'matricule'] }],
    });
    return success(res, full, 'Tâche mise à jour');
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const task = await db.ProjectTask.findByPk(req.params.taskId);
    if (!task) return notFound(res, 'Tâche introuvable');
    const { status, progress, blockedReason } = req.body;

    if (status === 'Bloqué' && !String(blockedReason || task.blockedReason || '').trim()) {
      return badRequest(res, 'Une explication est obligatoire pour une tâche bloquée');
    }

    const wasBlocked = task.status === 'Bloqué';
    const autoProgress = { 'À faire': 0, 'En cours': 50, 'Terminé': 100, 'Bloqué': task.progress };
    await task.update({
      status,
      blockedReason: status === 'Bloqué' ? (blockedReason || task.blockedReason) : task.blockedReason,
      progress: progress !== undefined ? progress : (autoProgress[status] ?? task.progress),
    });

    if (status === 'Bloqué' && !wasBlocked) {
      await _notifyBlockedTask(task, req, blockedReason);
    }

    await _recalcProjectProgress(task.projectId);
    return success(res, task, 'Statut mis à jour');
});

exports.reorder = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { order } = req.body;
    const orderedIds = Array.isArray(order) ? order : req.body.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return badRequest(res, 'La liste ordonnée des tâches est obligatoire');
    }

    const tasks = await db.ProjectTask.findAll({ where: { projectId }, attributes: ['id'] });
    const validIds = new Set(tasks.map((t) => t.id));
    if (orderedIds.length !== tasks.length || orderedIds.some((id) => !validIds.has(Number(id)))) {
      return badRequest(res, 'Liste de tâches invalide pour ce chantier');
    }

    await db.sequelize.transaction(async (transaction) => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.ProjectTask.update(
          { position: i },
          { where: { id: orderedIds[i], projectId }, transaction },
        );
      }
    });

    const updated = await db.ProjectTask.findAll({
      where: { projectId },
      include: [{ model: db.Employee, as: 'assignee', attributes: ['id', 'name', 'matricule', 'role'] }],
      order: [['position', 'ASC'], ['id', 'ASC']],
    });
    return success(res, updated, 'Ordre des tâches mis à jour');
});

exports.remove = asyncHandler(async (req, res) => {
    const task = await db.ProjectTask.findByPk(req.params.taskId);
    if (!task) return notFound(res, 'Tâche introuvable');
    const { projectId } = task;
    await task.destroy();
    await _recalcProjectProgress(projectId);
    return success(res, null, 'Tâche supprimée');
});

async function _notifyBlockedTask(task, req, blockedReason) {
  const project = await db.Project.findByPk(task.projectId, { attributes: ['id', 'name', 'code'] });
  const reason = String(blockedReason || task.blockedReason || '').trim();
  const description = [
    `Chantier : ${project?.name || task.projectId}`,
    `Tâche : ${task.title}`,
    `Raison : ${reason}`,
    `Signalé par : ${req.user?.prenom || ''} ${req.user?.nom || ''}`.trim(),
  ].join('\n');

  await db.Ticket.create({
    title: `[BLOQUÉ] ${task.title} — ${project?.name || 'Chantier'}`,
    module: 'Projets',
    priority: 'Critique',
    status: 'Ouvert',
    description,
    createdBy: req.user?.id,
    createdByRole: req.role,
  }).catch(() => {});

  await db.Log.create({
    action: `Tâche bloquée : ${task.title} (${project?.name || task.projectId})`,
    module: 'Projets',
    entityType: 'ProjectTask',
    entityId: task.id,
    userId: req.user?.id,
    userRole: req.role,
    userMatricule: req.user?.matricule,
  }).catch(() => {});
}

// Avancement = tâches terminées / total ; étape = dernière tâche terminée
async function _recalcProjectProgress(projectId) {
  const tasks = await db.ProjectTask.findAll({
    where: { projectId },
    order: [['position', 'ASC'], ['id', 'ASC']],
  });
  const progress = computeProgressFromTasks(tasks);
  const status = computeStageFromTasks(tasks);
  await db.Project.update({ progress, status }, { where: { id: projectId } });
  return progress;
}
