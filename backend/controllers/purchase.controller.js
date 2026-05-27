const db = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest, forbidden } = require('../utils/response');
const accountingIntegration = require('../services/accountingIntegration.service');

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
  if (req.query.status) where.status = req.query.status;

  if (req.role === 'Chef_chantier' && !req.query.projectId) {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    where.projectId = projects.map((p) => p.id);
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

const buildLineRef = (orderRef, index) => `${orderRef}-${String(index + 1).padStart(2, '0')}`;

exports.create = asyncHandler(async (req, res) => {
  const { item, quantity, projectId } = req.body;
  if (!item || !quantity || !projectId) {
    return badRequest(res, 'Champs obligatoires manquants : item, quantity, projectId');
  }

  const orderRef = req.body.orderRef || `BC-${Date.now()}`;
  const purchase = await db.Purchase.create({
    ...req.body,
    status: 'En attente',
    purchaseDate: req.body.purchaseDate || new Date().toISOString().split('T')[0],
    unitPrice: req.body.unitPrice ?? 0,
    ref: req.body.ref || buildLineRef(orderRef, 0),
    orderRef,
    createdBy: req.user.id,
  });

  await logAction(`Bon de commande soumis pour validation DG : ${item}`, purchase.id, req);
  return created(res, purchase, 'Demande d\'achat soumise au directeur');
});

exports.createBatch = asyncHandler(async (req, res) => {
  const { projectId, lines, provider, deliveryDate, purchaseDate, designation, priority } = req.body;

  if (!projectId) {
    return badRequest(res, 'Champ obligatoire manquant : projectId');
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return badRequest(res, 'Au moins une ligne d\'article est requise');
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line?.item || !line?.quantity || Number(line.quantity) <= 0) {
      return badRequest(res, `Ligne ${i + 1} : article et quantité (> 0) obligatoires`);
    }
  }

  const orderRef = `BC-${Date.now()}`;
  const common = {
    projectId,
    provider: provider || null,
    deliveryDate: deliveryDate || null,
    purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
    status: 'En attente',
    orderRef,
    createdBy: req.user.id,
    designation: designation || null,
    priority: priority || 'Normale',
  };

  const createdLines = await db.sequelize.transaction(async (transaction) => {
    const rows = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const row = await db.Purchase.create({
        ...common,
        item: line.item,
        quantity: line.quantity,
        unit: line.unit || null,
        unitPrice: line.unitPrice ?? 0,
        ref: buildLineRef(orderRef, i),
      }, { transaction });
      rows.push(row);
    }
    return rows;
  });

  const summary = createdLines.map((l) => l.item).join(', ');
  await logAction(
    `Bon de commande multi-lignes (${createdLines.length}) soumis : ${summary}`,
    createdLines[0].id,
    req,
  );

  return created(res, { orderRef, lines: createdLines }, 'Bon de commande soumis au directeur');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const purchase = await db.Purchase.findByPk(req.params.id);
  if (!purchase) return notFound(res, 'Achat introuvable');

  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return badRequest(res, `Statut invalide. Valeurs acceptées : ${VALID_STATUSES.join(', ')}`);
  }

  if (req.role === 'Chef_chantier') {
    if (status === 'Livré' && purchase.status === 'Validé') {
      await purchase.update({ status: 'Livré' });
      await logAction(`Achat ${purchase.ref} marqué livré`, purchase.id, req);
      return success(res, purchase, 'Achat marqué comme livré');
    }
    return forbidden(res, 'Seul le directeur peut valider un bon de commande');
  }

  if (purchase.status === 'En attente' && !['Validé', 'Annulé'].includes(status)) {
    return badRequest(res, 'Depuis "En attente", validez (Validé) ou annulez (Annulé)');
  }
  await purchase.update({ status });
  await logAction(`Statut achat ${purchase.ref} → ${status}`, purchase.id, req);

  if (status === 'Validé' || status === 'Livré') {
    const project = await db.Project.findByPk(purchase.projectId);
    void accountingIntegration.postBtpCost({
      type: 'PURCHASE',
      sourceId: purchase.id,
      reference: purchase.ref,
      entryDate: purchase.purchaseDate,
      amount: Number(purchase.quantity || 0) * Number(purchase.unitPrice || 0),
      label: purchase.item,
      provider: purchase.provider,
      ...accountingIntegration.projectPayload(project),
    });
  }

  return success(res, purchase, `Achat marqué comme "${status}"`);
});

exports.remove = asyncHandler(async (req, res) => {
  const purchase = await db.Purchase.findByPk(req.params.id);
  if (!purchase) return notFound(res, 'Achat introuvable');
  if (purchase.status !== 'En attente') {
    return badRequest(res, 'Seuls les achats en attente peuvent être supprimés');
  }
  await purchase.destroy();
  return success(res, null, 'Achat supprimé');
});
