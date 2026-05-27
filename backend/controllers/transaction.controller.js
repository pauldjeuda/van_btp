const db = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest } = require('../utils/response');
const { buildAccountingEntries } = require('./transaction.controller.helpers');
const accountingIntegration = require('../services/accountingIntegration.service');

const logAction = (action, entityId, req) =>
  db.Log.create({
    action, module: 'Finances', entityType: 'Transaction', entityId,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.type) where.type = req.query.type;
  if (req.query.status) where.status = req.query.status;

  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    where.projectId = projects.map((p) => p.id);
  }

  const transactions = await db.Transaction.findAll({
    where,
    include: [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }],
    order: [['transactionDate', 'DESC']],
  });
  return success(res, transactions);
});

exports.create = asyncHandler(async (req, res) => {
  const { projectId, type, amount, transactionDate } = req.body;
  if (!projectId || !type || !amount || !transactionDate) {
    return badRequest(res, 'Champs obligatoires manquants : projectId, type, amount, transactionDate');
  }

  const prefix = type === 'expense' ? 'DEP' : 'FAC';
  const reference = `${prefix}-${Date.now()}`;

  const chefExpensePending = req.role === 'Chef_chantier' && type === 'expense';
  const status = chefExpensePending
    ? 'En attente'
    : (req.body.status || (type === 'expense' ? 'Validé' : 'En attente'));

  const transaction = await db.Transaction.create({
    ...req.body,
    reference,
    status,
    createdBy: req.user.id,
    isClientDebt: req.body.isClientDebt || false,
    debtStatus: req.body.isClientDebt ? 'Non remboursé' : null,
  });

  await logAction(
    chefExpensePending
      ? `Dépense soumise pour validation DG : ${amount} FCFA`
      : `Nouvelle ${type === 'expense' ? 'dépense' : 'facture'} : ${amount} FCFA`,
    transaction.id,
    req
  );

  if (status === 'Validé' || status === 'Payé') {
    await db.AccountingEntry.bulkCreate(
      buildAccountingEntries(transaction, { ...req.body, createdBy: req.user.id })
    );
    const project = await db.Project.findByPk(transaction.projectId);
    void accountingIntegration.postBtpCost({
      type: transaction.type === 'expense' ? 'PROJECT_COST' : 'EVENTUAL_CHARGE',
      sourceId: transaction.id,
      reference: transaction.reference,
      entryDate: transaction.transactionDate,
      amount: transaction.amount,
      label: transaction.description || transaction.category,
      provider: transaction.provider,
      ...accountingIntegration.projectPayload(project),
    });
  }

  return created(
    res,
    transaction,
    chefExpensePending ? 'Dépense soumise — en attente de validation du directeur' : 'Transaction enregistrée'
  );
});

exports.update = asyncHandler(async (req, res) => {
  const transaction = await db.Transaction.findByPk(req.params.id);
  if (!transaction) return notFound(res, 'Transaction introuvable');
  if (req.role === 'Chef_chantier' && transaction.status !== 'En attente') {
    return badRequest(res, 'Modification impossible après validation');
  }
  await transaction.update(req.body);
  return success(res, transaction, 'Transaction mise à jour');
});

exports.remove = asyncHandler(async (req, res) => {
  const transaction = await db.Transaction.findByPk(req.params.id);
  if (!transaction) return notFound(res, 'Transaction introuvable');
  await transaction.destroy();
  return success(res, null, 'Transaction supprimée');
});
