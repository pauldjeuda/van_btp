const db = require('../models');
const { buildAccountingEntries } = require('../controllers/transaction.controller.helpers');
const accountingIntegration = require('./accountingIntegration.service');

const mapAmendment = (a) => ({
  id: a.id,
  type: 'amendment',
  entityType: 'ProjectAmendment',
  title: `Avenant ${a.type}`,
  description: (a.justification || '').slice(0, 160),
  projectId: a.projectId,
  projectName: a.project?.name || 'Chantier',
  amount: a.nouveauBudget ? parseFloat(a.nouveauBudget) : null,
  createdAt: a.createdAt,
  navigateTo: '/projects',
});

const purchaseLineTotal = (p) => parseFloat(p.quantity || 0) * parseFloat(p.unitPrice || 0);

const groupPendingPurchases = (purchases) => {
  const groups = new Map();
  for (const p of purchases) {
    const key = p.orderRef || `single-${p.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return [...groups.values()];
};

const mapPurchaseGroup = (lines) => {
  const first = lines[0];
  const totalAmount = lines.reduce((sum, l) => sum + purchaseLineTotal(l), 0);
  const title =
    lines.length > 1
      ? `Bon de commande — ${lines.length} articles`
      : `Bon de commande — ${first.item}`;
  const description =
    lines.length > 1
      ? lines.map((l) => l.item).join(', ')
      : (first.ref || '');
  return {
    id: first.id,
    type: 'purchase',
    entityType: 'Purchase',
    title,
    description,
    projectId: first.projectId,
    projectName: first.project?.name || 'Chantier',
    amount: totalAmount,
    createdAt: first.createdAt,
    navigateTo: '/resources',
    orderRef: first.orderRef || null,
    lineCount: lines.length,
  };
};

const mapExpense = (t) => ({
  id: t.id,
  type: 'expense',
  entityType: 'Transaction',
  title: `Dépense — ${t.category || t.provider || 'Sans libellé'}`,
  description: t.description || t.reference,
  projectId: t.projectId,
  projectName: t.project?.name || 'Chantier',
  amount: parseFloat(t.amount || 0),
  createdAt: t.createdAt,
  navigateTo: '/finances',
});

const mapQuote = (q) => ({
  id: q.id,
  type: 'quote',
  entityType: 'ProjectQuote',
  title: `Devis chantier — ${q.project?.name || 'Chantier'}`,
  description: q.title || '',
  projectId: q.projectId,
  projectName: q.project?.name || 'Chantier',
  amount: parseFloat(q.totalAmount || 0),
  createdAt: q.createdAt,
  navigateTo: `/projects/${q.projectId}#documents`,
});

exports.fetchPendingItems = async () => {
  const [amendments, purchases, expenses, quotes] = await Promise.all([
    db.ProjectAmendment.findAll({
      where: { statut: 'En attente' },
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'DESC']],
    }),
    db.Purchase.findAll({
      where: { status: 'En attente' },
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'DESC']],
    }),
    db.Transaction.findAll({
      where: { type: 'expense', status: 'En attente' },
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'DESC']],
    }),
    db.ProjectQuote.findAll({
      where: { status: 'En attente' },
      include: [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'DESC']],
    }),
  ]);

  const items = [
    ...amendments.map(mapAmendment),
    ...groupPendingPurchases(purchases).map(mapPurchaseGroup),
    ...expenses.map(mapExpense),
    ...quotes.map(mapQuote),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    items,
    counts: {
      amendment: amendments.length,
      purchase: groupPendingPurchases(purchases).length,
      expense: expenses.length,
      quote: quotes.length,
      total: items.length,
    },
  };
};

exports.approveAmendment = async (id, userId) => {
  const amendment = await db.ProjectAmendment.findByPk(id);
  if (!amendment) return { ok: false, code: 404, message: 'Avenant introuvable' };
  if (amendment.statut !== 'En attente') return { ok: false, code: 400, message: 'Avenant déjà traité' };

  await amendment.update({ statut: 'Approuvé', approvedBy: userId });
  const project = await db.Project.findByPk(amendment.projectId);
  if (project) {
    const updates = {};
    if (amendment.nouvelleDate) updates.endDate = amendment.nouvelleDate;
    if (amendment.nouveauBudget) updates.budget = amendment.nouveauBudget;
    if (Object.keys(updates).length) await project.update(updates);
  }
  return { ok: true, entity: amendment };
};

exports.rejectAmendment = async (id, userId) => {
  const amendment = await db.ProjectAmendment.findByPk(id);
  if (!amendment) return { ok: false, code: 404, message: 'Avenant introuvable' };
  if (amendment.statut !== 'En attente') return { ok: false, code: 400, message: 'Avenant déjà traité' };
  await amendment.update({ statut: 'Rejeté', approvedBy: userId });
  return { ok: true, entity: amendment };
};

const findPurchaseGroup = async (id) => {
  const purchase = await db.Purchase.findByPk(id);
  if (!purchase) return null;
  if (!purchase.orderRef) return [purchase];
  return db.Purchase.findAll({
    where: { orderRef: purchase.orderRef, status: 'En attente' },
    order: [['id', 'ASC']],
  });
};

exports.approvePurchase = async (id) => {
  const group = await findPurchaseGroup(id);
  if (!group?.length) return { ok: false, code: 404, message: 'Achat introuvable' };
  if (group.some((p) => p.status !== 'En attente')) {
    return { ok: false, code: 400, message: 'Achat déjà traité' };
  }

  const project = await db.Project.findByPk(group[0].projectId);
  for (const purchase of group) {
    await purchase.update({ status: 'Validé' });
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
  return { ok: true, entity: group[0], approvedCount: group.length };
};

exports.rejectPurchase = async (id) => {
  const group = await findPurchaseGroup(id);
  if (!group?.length) return { ok: false, code: 404, message: 'Achat introuvable' };
  if (group.some((p) => p.status !== 'En attente')) {
    return { ok: false, code: 400, message: 'Achat déjà traité' };
  }
  for (const purchase of group) {
    await purchase.update({ status: 'Annulé' });
  }
  return { ok: true, entity: group[0], rejectedCount: group.length };
};

exports.approveExpense = async (id, userId) => {
  const transaction = await db.Transaction.findByPk(id);
  if (!transaction) return { ok: false, code: 404, message: 'Dépense introuvable' };
  if (transaction.type !== 'expense' || transaction.status !== 'En attente') {
    return { ok: false, code: 400, message: 'Dépense déjà traitée' };
  }

  await transaction.update({ status: 'Validé' });
  const existing = await db.AccountingEntry.count({ where: { transactionId: transaction.id } });
  if (!existing) {
    await db.AccountingEntry.bulkCreate(
      buildAccountingEntries(transaction, { provider: transaction.provider, createdBy: userId })
    );
  }
  const project = await db.Project.findByPk(transaction.projectId);
  void accountingIntegration.postBtpCost({
    type: 'PROJECT_COST',
    sourceId: transaction.id,
    reference: transaction.reference,
    entryDate: transaction.transactionDate,
    amount: transaction.amount,
    label: transaction.description || transaction.category,
    provider: transaction.provider,
    ...accountingIntegration.projectPayload(project),
  });
  return { ok: true, entity: transaction };
};

exports.rejectExpense = async (id) => {
  const transaction = await db.Transaction.findByPk(id);
  if (!transaction) return { ok: false, code: 404, message: 'Dépense introuvable' };
  if (transaction.type !== 'expense' || transaction.status !== 'En attente') {
    return { ok: false, code: 400, message: 'Dépense déjà traitée' };
  }
  await transaction.update({ status: 'Rejeté' });
  return { ok: true, entity: transaction };
};

exports.approveQuote = async (id, userId) => {
  const quote = await db.ProjectQuote.findByPk(id);
  if (!quote) return { ok: false, code: 404, message: 'Devis introuvable' };
  if (quote.status !== 'En attente') return { ok: false, code: 400, message: 'Devis déjà traité' };
  await quote.update({ status: 'Validé', reviewedBy: userId, rejectionReason: null });
  return { ok: true, entity: quote };
};

exports.rejectQuote = async (id, userId) => {
  const quote = await db.ProjectQuote.findByPk(id);
  if (!quote) return { ok: false, code: 404, message: 'Devis introuvable' };
  if (quote.status !== 'En attente') return { ok: false, code: 400, message: 'Devis déjà traité' };
  await quote.update({ status: 'Rejeté', reviewedBy: userId });
  return { ok: true, entity: quote };
};
