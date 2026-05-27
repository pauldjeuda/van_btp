const asyncHandler = require('../middlewares/asyncHandler');
/**
 * controllers/project.controller.js
 * CRUD chantiers avec filtrage par rôle (DG voit tout, Chef voit les siens).
 */
const { Op } = require('sequelize');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');
const { DEFAULT_BTP_TASKS } = require('../utils/defaultProjectTasks');
const { ROLE_DG } = require('../utils/roles');
const {
  taskFieldsForStageIndex,
  computeStageFromTasks,
  computeProgressFromTasks,
  syncTasksToAdvancementStage,
} = require('../utils/advancementStage');
const { resolveChefProjectIds } = require('../utils/chefProjectAccess');

exports.getAll = asyncHandler(async (req, res) => {
    const { role, user } = req;
    const where = {};

    // Chef : chantiers liés (chefId ou fiche employé — réparation auto si besoin)
    if (role === 'Chef_chantier') {
      const projectIds = await resolveChefProjectIds(user);
      if (!projectIds.length) {
        return success(res, []);
      }
      where.id = { [Op.in]: projectIds };
    }

    // Filtres query string
    if (req.query.region)  where.region = req.query.region;
    if (req.query.status)  where.status = req.query.status;

    const projects = await db.Project.findAll({
      where,
      include: [{ model: db.ChefChantier, as: 'chefChantier', attributes: ['id', 'nom', 'prenom', 'matricule'] }],
      order: [['createdAt', 'DESC']],
    });
    return success(res, projects);
});

exports.getById = asyncHandler(async (req, res) => {
    const project = await db.Project.findByPk(req.params.id, {
      include: [
        { model: db.ChefChantier, as: 'chefChantier', attributes: ['id', 'nom', 'prenom'] },
        { model: db.Employee, as: 'employees' },
        { model: db.Transaction, as: 'transactions' },
        { model: db.Subcontract, as: 'subcontracts', include: [{ model: db.SubcontractTask, as: 'tasks' }] },
      ],
    });
    if (!project) return notFound(res, 'Projet introuvable');
    return success(res, project);
});

exports.create = asyncHandler(async (req, res) => {
    if (req.role !== ROLE_DG) {
      return error(res, 'Seul le directeur technique peut créer un chantier', 403);
    }

    const {
      code, name, client, budget, location, region, startDate, endDate, status,
      category, subCategory, montantMarche, budgetItems, parentId, manager, progress,
      chefId, airRate, guaranteeRetention, guaranteeBank,
    } = req.body;
    if (!code || !name || !client) {
      return badRequest(res, 'Le code, le nom et le client sont obligatoires');
    }

    const advancementStage = status || '';
    const stageIndex = advancementStage
      ? DEFAULT_BTP_TASKS.indexOf(advancementStage)
      : -1;

    const project = await db.Project.create({
      code, name, client,
      budget:        budget || 0,
      montantMarche: montantMarche || budget || 0,
      location, region, startDate, endDate,
      status:      advancementStage,
      category:    category    || 'Autre',
      subCategory: (subCategory && subCategory.trim()) ? subCategory.trim() : null,
      budgetItems: budgetItems || [],
      parentId:    parentId    || null,
      manager:     manager      || null,
      airRate: airRate || null,
      guaranteeRetention: guaranteeRetention || null,
      guaranteeBank: guaranteeBank || null,
      progress:    0,
      chefId:      chefId || null,
    });

    // Tâches génériques BTP par défaut + état d'avancement initial
    const taskRows = DEFAULT_BTP_TASKS.map((title, index) => ({
      title,
      projectId: project.id,
      ...taskFieldsForStageIndex(index, stageIndex),
      priority: 'Normale',
      position: index,
      createdBy: req.user.id,
    }));
    await db.ProjectTask.bulkCreate(taskRows);

    const initialProgress = computeProgressFromTasks(taskRows);
    await project.update({
      progress: initialProgress,
      status: advancementStage,
    });

    // Logger l'action
    await db.Log.create({
      action: `Création du projet : ${name}`,
      module: 'Projets', entityType: 'Project', entityId: project.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });

    return created(res, project, 'Projet créé avec succès');
});

exports.update = asyncHandler(async (req, res) => {
    if (req.role !== ROLE_DG) {
      return error(res, 'Seul le directeur technique peut modifier un chantier', 403);
    }

    const project = await db.Project.findByPk(req.params.id);
    if (!project) return notFound(res, 'Projet introuvable');

    const { body } = req;
    // Ne plus recalculer progress depuis le statut — l'avancement vient des tâches
    if (body.progress === undefined) {
      delete body.progress;
    }

    // Normaliser subCategory: ne pas envoyer de string vide à l'ENUM
    if (body.subCategory !== undefined && !body.subCategory?.trim()) {
      body.subCategory = null;
    }
    const previousStatus = project.status;
    await project.update(body);

    if (body.status !== undefined && body.status !== previousStatus) {
      const synced = await syncTasksToAdvancementStage(db, project.id, body.status);
      await project.update({ progress: synced.progress, status: synced.status });
    }

    await db.Log.create({
      action: `Modification du projet : ${project.name}`,
      module: 'Projets', entityType: 'Project', entityId: project.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });

    return success(res, project, 'Projet mis à jour');
});

exports.remove = asyncHandler(async (req, res) => {
    if (req.role !== ROLE_DG) {
      return error(res, 'Seul le directeur technique peut supprimer un chantier', 403);
    }

    const project = await db.Project.findByPk(req.params.id);
    if (!project) return notFound(res, 'Projet introuvable');

    const projectId = project.id;

    await db.sequelize.transaction(async (t) => {
      const [unassignedCount] = await db.Employee.update(
        { projectId: null },
        { where: { projectId }, transaction: t },
      );

      await db.Equipment.update(
        { projectId: null },
        { where: { projectId }, transaction: t },
      );

      await project.destroy({ transaction: t });

      await db.Log.create({
        action: `Suppression du projet : ${project.name}${unassignedCount ? ` — ${unassignedCount} collaborateur(s) désaffecté(s)` : ''}`,
        module: 'Projets',
        entityType: 'Project',
        entityId: projectId,
        userId: req.user.id,
        userRole: req.role,
        userMatricule: req.user.matricule,
      }, { transaction: t });
    });

    return success(res, null, 'Projet supprimé — le personnel affecté est de nouveau disponible');
});
