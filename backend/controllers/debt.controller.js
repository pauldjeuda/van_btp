const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

exports.getAll = asyncHandler(async (req, res) => {
  const where = { isClientDebt: true };
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.debtStatus) where.debtStatus = req.query.debtStatus;
  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    where.projectId = projects.map(p => p.id);
  }
  const debts = await db.Transaction.findAll({
    where,
    include: [
      { model: db.Project, as: 'project', attributes: ['id', 'name'] },
      { model: db.DebtRepayment, as: 'repayments', order: [['repaymentDate', 'DESC']] },
    ],
    order: [['transactionDate', 'DESC']],
  });
  return success(res, debts);
});

exports.addRepayment = asyncHandler(async (req, res) => {
  const transaction = await db.Transaction.findOne({
    where: { id: req.params.id, isClientDebt: true },
    include: [{ model: db.DebtRepayment, as: 'repayments' }],
  });
  if (!transaction) return notFound(res, 'Dette introuvable');

  const { amount, repaymentDate, reference, paymentMethod, note } = req.body;
  if (!amount || !repaymentDate) return badRequest(res, 'Montant et date obligatoires');

  // Vérifier que le remboursement ne dépasse pas la dette restante
  const dejaRembourse = transaction.repayments.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const resteARegler = parseFloat(transaction.amount) - dejaRembourse;
  if (parseFloat(amount) > resteARegler + 0.01) { // +0.01 pour tolérance arrondi
    return badRequest(res,
      `Le montant (${parseFloat(amount).toLocaleString()} FCFA) dépasse le reste dû ` +
      `(${resteARegler.toLocaleString()} FCFA). Saisissez au maximum ${Math.ceil(resteARegler).toLocaleString()} FCFA.`
    );
  }

  const repayment = await db.DebtRepayment.create({
    transactionId: transaction.id, amount: parseFloat(amount),
    repaymentDate, reference, paymentMethod, note, recordedBy: req.user.id,
  });

  // Recalculer le montant remboursé total
  const totalPaid = transaction.repayments.reduce((s, r) => s + parseFloat(r.amount), 0) + parseFloat(amount);
  const totalDebt = parseFloat(transaction.amount);
  let debtStatus = 'Non remboursé';
  if (totalPaid >= totalDebt) debtStatus = 'Remboursé';
  else if (totalPaid > 0) debtStatus = 'Partiellement remboursé';

  await transaction.update({ debtAmountPaid: totalPaid, debtStatus });

  await db.Log.create({
    action: `Remboursement dette de ${amount} FCFA (réf: ${reference || 'N/A'})`,
    module: 'Finances', entityType: 'DebtRepayment', entityId: repayment.id,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });

  return created(res, { repayment, debtStatus, totalPaid }, 'Remboursement enregistré');
});
