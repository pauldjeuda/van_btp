const db = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest } = require('../utils/response');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const logAction = (action, entityId, req) =>
  db.Log.create({
    action, module: 'Finances', entityType: 'Transaction', entityId,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });

const buildAccountingEntries = (transaction, body) => {
  const { type, amount, projectId, transactionDate: journalDate, reference: ref } = transaction;
  const base = { transactionId: transaction.id, projectId, journalDate, reference: ref, createdBy: body.createdBy };

  if (type === 'invoice') {
    const label = `Facture ${ref} - ${body.client || 'Client'}`;
    return [
      { ...base, label, account: '411', accountLabel: 'Clients', debit: parseFloat(amount), credit: 0 },
      { ...base, label, account: '706', accountLabel: 'Prestations de services', debit: 0, credit: parseFloat(amount) },
    ];
  }

  const label = `Dépense ${ref} - ${body.provider || 'Fournisseur'}`;
  return [
    { ...base, label, account: '601', accountLabel: 'Achats matières', debit: parseFloat(amount), credit: 0 },
    { ...base, label, account: '401', accountLabel: 'Fournisseurs', debit: 0, credit: parseFloat(amount) },
  ];
};

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.getAll = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.type) where.type = req.query.type;
  if (req.query.status) where.status = req.query.status;

  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    where.projectId = projects.map(p => p.id);
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

  const transaction = await db.Transaction.create({
    ...req.body,
    reference,
    createdBy: req.user.id,
    isClientDebt: req.body.isClientDebt || false,
    debtStatus: req.body.isClientDebt ? 'Non remboursé' : null,
  });

  await logAction(
    `Nouvelle ${type === 'expense' ? 'dépense' : 'facture'} : ${amount} FCFA`,
    transaction.id, req
  );

  await db.AccountingEntry.bulkCreate(
    buildAccountingEntries(transaction, { ...req.body, createdBy: req.user.id })
  );

  return created(res, transaction, 'Transaction enregistrée');
});

exports.update = asyncHandler(async (req, res) => {
  const transaction = await db.Transaction.findByPk(req.params.id);
  if (!transaction) return notFound(res, 'Transaction introuvable');
  await transaction.update(req.body);
  return success(res, transaction, 'Transaction mise à jour');
});

exports.remove = asyncHandler(async (req, res) => {
  const transaction = await db.Transaction.findByPk(req.params.id);
  if (!transaction) return notFound(res, 'Transaction introuvable');
  await transaction.destroy();
  return success(res, null, 'Transaction supprimée');
});
