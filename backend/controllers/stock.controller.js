const db = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { Op } = require('sequelize');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.type) where.type = req.query.type;
    if (req.query.warehouse) where.warehouse = req.query.warehouse;

    // Gestion de la visibilité par rôle
    if (req.role === 'Chef_chantier') {
      const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
      const myProjectIds = projects.map(p => p.id);
      
      if (req.query.projectId) {
        const targetId = Number(req.query.projectId);
        if (targetId === 0) {
          where.projectId = null; // Autoriser le magasin central pour les chefs
        } else if (myProjectIds.includes(targetId)) {
          where.projectId = targetId;
        } else {
          return success(res, []); // Interdire l'accès aux autres chantiers
        }
      } else {
        // Par défaut: ses chantiers + le magasin central
        where[Op.or] = [{ projectId: myProjectIds }, { projectId: null }];
      }
    } else if (req.role === 'Technicien_chantier') {
      const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule } });
      const myPid = emp?.projectId;
      
      if (req.query.projectId) {
        const targetId = Number(req.query.projectId);
        if (targetId === 0) {
          where.projectId = null; // Autoriser le magasin pour les techniciens (pour les retours)
        } else if (Number(targetId) === Number(myPid)) {
          where.projectId = targetId;
        } else {
          return success(res, []);
        }
      } else {
        // Par défaut: son chantier + le magasin central
        where[Op.or] = myPid ? [{ projectId: myPid }, { projectId: null }] : [{ projectId: null }];
      }
    } else {
      // Pour le DG / Admin
      if (req.query.projectId !== undefined) {
        where.projectId = Number(req.query.projectId) === 0 ? null : req.query.projectId;
      }
    }
    const movements = await db.StockMovement.findAll({
      where,
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['movementDate', 'DESC']],
    });

    const formattedMovements = movements.map(m => {
      const data = m.toJSON();
      if (data.projectId === null || data.projectId === undefined) {
        data.projectId = 0;
        data.project = { id: 0, name: 'Magasin Central' };
      }
      return data;
    });

    return success(res, formattedMovements);
});

exports.create = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { type, item, quantity, projectId, movementDate, toProjectId } = req.body;
    if (!type || !item || !quantity || projectId === undefined || projectId === null || !movementDate) {
      await transaction.rollback();
      return badRequest(res, 'Champs obligatoires : type, item, quantity, projectId, movementDate');
    }

    let project = null;
    if (projectId !== 0) {
      project = await db.Project.findByPk(projectId, { transaction });
      if (!project) {
        await transaction.rollback();
        return badRequest(res, `Projet ${projectId} introuvable`);
      }

      // Vérification des droits par rôle (uniquement pour les projets réels)
      if (req.role === 'Chef_chantier' && project.chefId !== req.user.id) {
        await transaction.rollback();
        return badRequest(res, 'Vous ne pouvez créer des mouvements que sur vos propres projets');
      }
    } else {
      // Magasin Central: seul le DG (ou admin) peut généralement gérer le magasin central
      // Mais on laisse passer pour l'instant selon les besoins ERP
      if (req.role === 'Technicien_chantier') {
        await transaction.rollback();
        return badRequest(res, 'Les techniciens ne peuvent pas gérer le Magasin Central');
      }
    }

    if (req.role === 'Technicien_chantier' && projectId !== 0) {
      const emp = await db.Employee.findOne({ where: { matricule: req.user.matricule }, transaction });
      if (!emp || Number(emp.projectId) !== Number(projectId)) {
        await transaction.rollback();
        return badRequest(res, 'Vous ne pouvez créer des mouvements que sur votre chantier d\'affectation');
      }
    }

    // ── Vérification du solde pour une Sortie ou Transfert ──────────────────
    if (type === 'Sortie' || type === 'Transfert') {
      const allMovements = await db.StockMovement.findAll({
        where: { 
          item, 
          projectId: Number(projectId) === 0 ? null : projectId 
        },
        transaction
      });
      const totalEntrees = allMovements
        .filter(m => m.type === 'Entrée')
        .reduce((s, m) => s + parseFloat(m.quantity || 0), 0);
      const totalSorties = allMovements
        .filter(m => m.type === 'Sortie' || m.type === 'Transfert')
        .reduce((s, m) => s + parseFloat(m.quantity || 0), 0);
      const soldeDispo = totalEntrees - totalSorties;

      if (parseFloat(quantity) > soldeDispo) {
        await transaction.rollback();
        return badRequest(res,
          `Stock insuffisant pour "${item}". ` +
          `Solde disponible : ${Math.max(0, soldeDispo)}, demandé : ${quantity}.`
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const movement = await db.StockMovement.create({ 
      ...req.body, 
      projectId: Number(projectId) === 0 ? null : projectId,
      warehouse: req.body.warehouse || 'Magasin Principal', 
      createdBy: req.user.id 
    }, { transaction });

    await db.Log.create({
      action: `Stock ${type} : ${quantity} ${req.body.unit || ''} de ${item}`,
      module: 'Stock', entityType: 'StockMovement', entityId: movement.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    }, { transaction });
    
    let destMovement;
    if (type === 'Transfert' && toProjectId !== undefined) {
      destMovement = await db.StockMovement.create({
        ...req.body,
        type: 'Entrée',
        projectId: Number(toProjectId) === 0 ? null : toProjectId,
        warehouse: req.body.warehouse || 'Magasin Principal',
        createdBy: req.user.id,
        note: req.body.note || `Réception du transfert depuis ${Number(projectId) === 0 ? 'Magasin Central' : 'Chantier ' + projectId}`
      }, { transaction });

      await db.Log.create({
        action: `Stock Entrée (Transfert) : ${quantity} ${req.body.unit || ''} de ${item}`,
        module: 'Stock', entityType: 'StockMovement', entityId: destMovement.id,
        userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
      }, { transaction });
    }

    await transaction.commit();

    const result = movement.toJSON();
    if (result.projectId === null) result.projectId = 0;
    
    if (destMovement) {
      const destResult = destMovement.toJSON();
      if (destResult.projectId === null) destResult.projectId = 0;
      return created(res, { source: result, dest: destResult }, 'Transfert de stock enregistré');
    }

    return created(res, result, 'Mouvement de stock enregistré');
  } catch (err) {
    if (err.name !== 'SequelizeUniqueConstraintError') {
      try { await transaction.rollback(); } catch(e) {}
    }
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.remove = asyncHandler(async (req, res) => {
  const movement = await db.StockMovement.findByPk(req.params.id);
  if (!movement) return notFound(res, 'Mouvement introuvable');
  await movement.destroy();
  return success(res, null, 'Mouvement supprimé');
});
