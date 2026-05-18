const db           = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest } = require('../utils/response');

const VALID_STATUSES = ['En attente', 'Validé', 'Livré', 'Annulé'];
const PROJECT_INCLUDE = [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }];

const logAction = (action, entityId, req) =>
  db.Log.create({
    action, module: 'Achats', entityType: 'Purchase', entityId,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.status)    where.status    = req.query.status;

  if (req.role === 'Chef_chantier' && !req.query.projectId) {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    where.projectId = projects.map(p => p.id);
  }

  const purchases = await db.Purchase.findAll({
    where,
    include: PROJECT_INCLUDE,
    order: [['purchaseDate', 'DESC']],
  });
  return success(res, purchases);
});

exports.getById = asyncHandler(async (req, res) => {
  const purchase = await db.Purchase.findByPk(req.params.id, { include: PROJECT_INCLUDE });
  if (!purchase) return notFound(res, 'Achat introuvable');
  return success(res, purchase);
});

exports.create = asyncHandler(async (req, res) => {
  const { item, quantity, projectId } = req.body;
  if (!item || !quantity || !projectId) {
    return badRequest(res, 'Champs obligatoires manquants : item, quantity, projectId');
  }

  const body = {
    ...req.body,
    purchaseDate: req.body.purchaseDate || new Date().toISOString().split('T')[0],
    unitPrice:    req.body.unitPrice ?? 0,
    ref:          `BC-${Date.now()}`,
    createdBy:    req.user.id,
  };

  const purchase = await db.Purchase.create(body);
  await logAction(`Bon de commande créé : ${item} — ${quantity} unités`, purchase.id, req);
  return created(res, purchase, 'Bon de commande créé');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const purchase = await db.Purchase.findByPk(req.params.id);
  if (!purchase) return notFound(res, 'Achat introuvable');

  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return badRequest(res, `Statut invalide. Valeurs acceptées : ${VALID_STATUSES.join(', ')}`);
  }

  await purchase.update({ status });
  await logAction(`Statut de l'achat ${purchase.ref} → ${status}`, purchase.id, req);
  return success(res, purchase, `Achat marqué comme "${status}"`);
});

exports.remove = asyncHandler(async (req, res) => {
  const purchase = await db.Purchase.findByPk(req.params.id);
  if (!purchase) return notFound(res, 'Achat introuvable');
  await purchase.destroy();
  return success(res, null, 'Achat supprimé');
});
