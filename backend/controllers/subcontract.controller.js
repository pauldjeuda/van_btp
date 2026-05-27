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

const sumTasksAmount = (tasks = []) =>
  tasks.reduce((sum, t) => sum + Number(t.cost || 0), 0);

const recalcProgress = async (subcontractId) => {
  const allTasks = await db.SubcontractTask.findAll({ where: { subcontractId } });
  const completedCount = allTasks.filter((t) => t.completed).length;
  const progress = allTasks.length > 0 ? Math.round((completedCount / allTasks.length) * 100) : 0;
  const sub = await db.Subcontract.findByPk(subcontractId);
  if (sub) await sub.update({ progress });
  return progress;
};

const syncPaymentStatus = async (subcontractId) => {
  const allTasks = await db.SubcontractTask.findAll({ where: { subcontractId } });
  if (!allTasks.length) return;
  const sub = await db.Subcontract.findByPk(subcontractId);
  if (!sub) return;
  const allPaid = allTasks.every((t) => t.paid);
  const allCompleted = allTasks.every((t) => t.completed);
  if (allPaid || allCompleted) {
    await sub.update({ paymentStatus: 'Payé' });
  }
};

const settleIfAllCompleted = async (subcontractId) => {
  const allTasks = await db.SubcontractTask.findAll({ where: { subcontractId } });
  if (!allTasks.length) return false;
  const allCompleted = allTasks.every((t) => t.completed);
  if (!allCompleted) return false;

  for (const task of allTasks) {
    if (!task.paid) await task.update({ paid: true });
  }
  const sub = await db.Subcontract.findByPk(subcontractId);
  if (sub) await sub.update({ paymentStatus: 'Payé' });
  return true;
};

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;

  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    if (!req.query.projectId) where.projectId = projects.map((p) => p.id);
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
  const { entreprise, projectId, tasks } = req.body;
  if (!entreprise || !projectId) return badRequest(res, 'Le nom et le projet sont obligatoires');

  const taskList = Array.isArray(tasks) ? tasks : [];
  const montant = sumTasksAmount(taskList) || Number(req.body.montant || 0);
  if (montant <= 0) {
    return badRequest(res, 'Attribuez un montant à au moins une tâche');
  }

  const sub = await db.Subcontract.create({
    ...req.body,
    montant,
    paymentStatus: 'En attente',
  });

  if (taskList.length) {
    await db.SubcontractTask.bulkCreate(
      taskList.map((t) => ({
        title: t.title,
        cost: Number(t.cost || 0),
        lotNumber: t.lotNumber || 1,
        lotName: t.lotName || 'Lot 1',
        completed: false,
        paid: false,
        subcontractId: sub.id,
      })),
    );
  }

  await logAction(`Sous-traitant créé : ${entreprise}`, sub.id, req);
  return created(res, await db.Subcontract.findByPk(sub.id, { include: SUBCONTRACT_INCLUDE }), 'Sous-traitant créé');
});

exports.update = asyncHandler(async (req, res) => {
  const sub = await db.Subcontract.findByPk(req.params.id, { include: SUBCONTRACT_INCLUDE });
  if (!sub) return notFound(res, 'Sous-traitant introuvable');

  const { tasks, ...rest } = req.body;

  if (tasks) {
    const existing = await db.SubcontractTask.findAll({ where: { subcontractId: sub.id } });
    const existingById = new Map(existing.map((t) => [t.id, t]));
    const keptIds = new Set();

    for (const t of tasks) {
      const payload = {
        title: t.title,
        cost: Number(t.cost || 0),
        lotNumber: t.lotNumber || 1,
        lotName: t.lotName || 'Lot 1',
      };

      if (t.id && existingById.has(Number(t.id))) {
        const row = existingById.get(Number(t.id));
        keptIds.add(row.id);
        await row.update({
          ...payload,
          completed: t.completed !== undefined ? !!t.completed : row.completed,
          paid: t.paid !== undefined ? !!t.paid : row.paid,
        });
      } else if (payload.title) {
        const createdTask = await db.SubcontractTask.create({
          ...payload,
          completed: false,
          paid: false,
          subcontractId: sub.id,
        });
        keptIds.add(createdTask.id);
      }
    }

    for (const row of existing) {
      if (!keptIds.has(row.id) && !row.paid) {
        await row.destroy({ force: true });
      }
    }

    const refreshed = await db.SubcontractTask.findAll({ where: { subcontractId: sub.id } });
    rest.montant = sumTasksAmount(refreshed);
    await recalcProgress(sub.id);
    await syncPaymentStatus(sub.id);
  }

  if (Object.keys(rest).length) {
    await sub.update(rest);
  }

  return success(res, await db.Subcontract.findByPk(sub.id, { include: SUBCONTRACT_INCLUDE }), 'Sous-traitant mis à jour');
});

exports.toggleTask = asyncHandler(async (req, res) => {
  const task = await db.SubcontractTask.findOne({
    where: { id: req.params.taskId, subcontractId: req.params.id },
  });
  if (!task) return notFound(res, 'Tâche introuvable');
  if (task.paid) {
    return badRequest(res, 'Impossible de modifier une tâche déjà payée');
  }
  await task.update({ completed: !task.completed });
  await recalcProgress(req.params.id);
  await settleIfAllCompleted(req.params.id);

  return success(res, await db.Subcontract.findByPk(req.params.id, { include: SUBCONTRACT_INCLUDE }), 'Tâche mise à jour');
});

exports.payCompletedTasks = asyncHandler(async (req, res) => {
  const sub = await db.Subcontract.findByPk(req.params.id, { include: SUBCONTRACT_INCLUDE });
  if (!sub) return notFound(res, 'Sous-traitant introuvable');

  const payableTasks = await db.SubcontractTask.findAll({
    where: { subcontractId: sub.id, completed: true, paid: false },
  });

  if (!payableTasks.length) {
    return badRequest(res, 'Aucune tâche terminée en attente de paiement');
  }

  const amount = payableTasks.reduce((sum, t) => sum + Number(t.cost || 0), 0);
  if (amount <= 0) {
    return badRequest(res, 'Les tâches terminées doivent avoir un montant supérieur à 0');
  }

  await db.sequelize.transaction(async (transaction) => {
    for (const task of payableTasks) {
      await task.update({ paid: true }, { transaction });
    }
  });

  await syncPaymentStatus(sub.id);
  const updated = await db.Subcontract.findByPk(sub.id, { include: SUBCONTRACT_INCLUDE });

  await logAction(
    `Paiement tâches ST (${payableTasks.length}) : ${sub.entreprise} — ${amount} FCFA`,
    sub.id,
    req,
  );

  return success(res, { subcontract: updated, amount, paidTaskIds: payableTasks.map((t) => t.id) }, 'Paiement enregistré');
});

exports.remove = asyncHandler(async (req, res) => {
  const sub = await db.Subcontract.findByPk(req.params.id);
  if (!sub) return notFound(res, 'Sous-traitant introuvable');
  await sub.destroy();
  return success(res, null, 'Sous-traitant supprimé');
});
