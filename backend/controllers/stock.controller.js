const db = require('../models');
const { formatQty } = require('../utils/formatNumbers');
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
      
      if (req.query.projectId !== undefined) {
        const targetId = Number(req.query.projectId);
        if (targetId === 0) {
          return success(res, []); // Magasin central interdit aux chefs de chantier
        }
        if (myProjectIds.includes(targetId)) {
          where.projectId = targetId;
        } else {
          return success(res, []);
        }
      } else if (myProjectIds.length) {
        where.projectId = myProjectIds;
      } else {
        return success(res, []);
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
    const { type, item, quantity, projectId, movementDate, toProjectId, materialId } = req.body;
    if (!type || !quantity || projectId === undefined || projectId === null || !movementDate) {
      await transaction.rollback();
      return badRequest(res, 'Champs obligatoires : type, quantity, projectId, movementDate');
    }

    let itemName = item?.trim();
    if (materialId) {
      const material = await db.StockMaterial.findByPk(materialId, { transaction });
      if (!material) {
        await transaction.rollback();
        return badRequest(res, 'Matériau introuvable');
      }
      itemName = material.name;
    }
    if (!itemName) {
      await transaction.rollback();
      return badRequest(res, 'Article ou materialId obligatoire');
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
    }

    // ── Vérification du solde pour une Sortie ou Transfert ──────────────────
    if (type === 'Sortie' || type === 'Transfert') {
      const allMovements = await db.StockMovement.findAll({
        where: {
          item: itemName,
          projectId: Number(projectId) === 0 ? null : projectId,
        },
        transaction,
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
          `Stock insuffisant pour "${itemName}". ` +
          `Solde disponible : ${formatQty(Math.max(0, soldeDispo))}, demandé : ${formatQty(quantity)}.`
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const movement = await db.StockMovement.create({
      ...req.body,
      item: itemName,
      materialId: materialId || null,
      projectId: Number(projectId) === 0 ? null : projectId,
      warehouse: req.body.warehouse || 'Magasin Principal',
      createdBy: req.user.id,
    }, { transaction });

    await db.Log.create({
      action: `Stock ${type} : ${quantity} ${req.body.unit || ''} de ${itemName}`,
      module: 'Stock', entityType: 'StockMovement', entityId: movement.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    }, { transaction });
    
    let destMovement;
    if (type === 'Transfert' && toProjectId !== undefined) {
      destMovement = await db.StockMovement.create({
        ...req.body,
        item: itemName,
        materialId: materialId || null,
        type: 'Entrée',
        projectId: Number(toProjectId) === 0 ? null : toProjectId,
        warehouse: req.body.warehouse || 'Magasin Principal',
        createdBy: req.user.id,
        note: req.body.note || `Réception du transfert depuis ${Number(projectId) === 0 ? 'Magasin Central' : 'Chantier ' + projectId}`,
      }, { transaction });

      await db.Log.create({
        action: `Stock Entrée (Transfert) : ${quantity} ${req.body.unit || ''} de ${itemName}`,
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
