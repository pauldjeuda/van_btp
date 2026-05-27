const asyncHandler = require('../middlewares/asyncHandler');
const db = require('../models');
const { success, badRequest, notFound } = require('../utils/response');
const approvalService = require('../services/approval.service');

exports.getPending = asyncHandler(async (req, res) => {
  const data = await approvalService.fetchPendingItems();
  return success(res, data);
});

exports.decide = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const { decision } = req.body;

  if (!['approve', 'reject'].includes(decision)) {
    return badRequest(res, 'decision doit être "approve" ou "reject"');
  }

  const handlers = {
    amendment: {
      approve: () => approvalService.approveAmendment(id, req.user.id),
      reject: () => approvalService.rejectAmendment(id, req.user.id),
    },
    purchase: {
      approve: () => approvalService.approvePurchase(id),
      reject: () => approvalService.rejectPurchase(id),
    },
    expense: {
      approve: () => approvalService.approveExpense(id, req.user.id),
      reject: () => approvalService.rejectExpense(id),
    },
    quote: {
      approve: () => approvalService.approveQuote(id, req.user.id),
      reject: () => approvalService.rejectQuote(id, req.user.id),
    },
  };

  const h = handlers[type];
  if (!h) return badRequest(res, 'Type invalide : amendment, purchase, expense, quote');

  const result = await h[decision]();
  if (!result.ok) {
    if (result.code === 404) return notFound(res, result.message);
    return badRequest(res, result.message);
  }

  await db.Log.create({
    action: `${decision === 'approve' ? 'Validation' : 'Rejet'} — ${type} #${id}`,
    module: 'Approbations',
    entityType: type,
    entityId: Number(id),
    userId: req.user.id,
    userRole: req.role,
    userMatricule: req.user.matricule,
  });

  const pending = await approvalService.fetchPendingItems();
  return success(
    res,
    { entity: result.entity, pending },
    decision === 'approve' ? 'Demande approuvée' : 'Demande rejetée'
  );
});
