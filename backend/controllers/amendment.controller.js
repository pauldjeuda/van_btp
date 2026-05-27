const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const amendments = await db.ProjectAmendment.findAll({
      where: { projectId },
      order: [['createdAt', 'DESC']],
    });
    return success(res, amendments);
});

exports.create = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { type, justification, ancienneDate, nouvelleDate, ancienBudget, nouveauBudget } = req.body;

    if (!type || !justification) return badRequest(res, 'Type et justification obligatoires');

    const project = await db.Project.findByPk(projectId);
    if (!project) return notFound(res, 'Projet introuvable');

    const amendment = await db.ProjectAmendment.create({
      projectId, type, justification,
      ancienneDate, nouvelleDate, ancienBudget, nouveauBudget,
      statut: 'En attente',
      createdBy: req.user.id,
    });

    await project.increment('amendmentCount');

    await db.Log.create({
      action: `Avenant soumis pour validation DG : ${type} — ${project.name}`,
      module: 'Projets', entityType: 'ProjectAmendment', entityId: amendment.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });

    return created(res, amendment, 'Avenant soumis au directeur pour validation');
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const amendment = await db.ProjectAmendment.findByPk(req.params.id);
    if (!amendment) return notFound(res, 'Avenant introuvable');

    const { statut } = req.body;
    const valid = ['En attente', 'Approuvé', 'Rejeté'];
    if (!valid.includes(statut)) return badRequest(res, `Statut invalide. Valeurs : ${valid.join(', ')}`);

    await amendment.update({ statut, approvedBy: req.user.id });

    // Si approuvé et délai modifié, mettre à jour le projet
    if (statut === 'Approuvé') {
      const project = await db.Project.findByPk(amendment.projectId);
      const updates = {};
      if (amendment.nouvelleDate) updates.endDate = amendment.nouvelleDate;
      if (amendment.nouveauBudget) updates.budget = amendment.nouveauBudget;
      if (Object.keys(updates).length) await project.update(updates);
    }

    return success(res, amendment, `Avenant ${statut.toLowerCase()}`);
});
