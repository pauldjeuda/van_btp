const db = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest, forbidden, error } = require('../utils/response');
const equipmentRequestService = require('../services/equipmentRequest.service');

const logAction = (action, entityId, req) =>
  db.Log.create({
    action,
    module: 'Ressources',
    entityType: 'EquipmentRequest',
    entityId,
    userId: req.user?.id,
    userRole: req.role,
    userMatricule: req.user?.matricule,
  }).catch(() => {});

exports.getAll = asyncHandler(async (req, res) => {
  const rows = await equipmentRequestService.list(req);
  return success(res, rows);
});

exports.getById = asyncHandler(async (req, res) => {
  const result = await equipmentRequestService.getById(req.params.id, req);
  if (!result.ok) {
    if (result.code === 404) return notFound(res, result.message);
    if (result.code === 403) return forbidden(res, result.message);
    return badRequest(res, result.message);
  }
  return success(res, result.entity);
});

exports.create = asyncHandler(async (req, res) => {
  console.log('[EQUIPMENT REQUEST API] POST /equipment-requests', {
    projectId: req.body?.projectId,
    desiredDate: req.body?.desiredDate,
    needDescriptionLen: String(req.body?.needDescription || '').length,
    role: req.role,
    userId: req.user?.id,
    matricule: req.user?.matricule,
  });
  const result = await equipmentRequestService.create(req.body, req);
  if (!result.ok) {
    if (result.code === 403) return forbidden(res, result.message);
    return badRequest(res, result.message);
  }

  await logAction(
    `Demande véhicule ${result.entity.ref} — ${result.entity.needDescription?.slice(0, 80)} (${result.entity.status})`,
    result.entity.id,
    req,
  );

  const message = result.syncOk
    ? 'Demande enregistrée et transmise à la logistique. En attente de validation.'
    : 'Demande enregistrée mais l\'envoi vers la logistique a échoué. Vous pouvez réessayer.';

  return created(res, result.entity, message);
});

exports.cancel = asyncHandler(async (req, res) => {
  const result = await equipmentRequestService.cancel(req.params.id, req);
  if (!result.ok) {
    if (result.code === 404) return notFound(res, result.message);
    if (result.code === 403) return forbidden(res, result.message);
    if (result.code === 502) return error(res, result.message, 502);
    return badRequest(res, result.message);
  }
  await logAction(`Demande engin ${result.entity.ref} annulée`, result.entity.id, req);
  return success(res, result.entity, 'Demande annulée');
});

exports.retry = asyncHandler(async (req, res) => {
  console.log('[EQUIPMENT REQUEST API] POST /equipment-requests/:id/retry', {
    id: req.params.id,
    role: req.role,
    userId: req.user?.id,
  });
  const result = await equipmentRequestService.retrySend(req.params.id, req);
  if (!result.ok) {
    if (result.code === 404) return notFound(res, result.message);
    if (result.code === 403) return forbidden(res, result.message);
    return badRequest(res, result.message);
  }
  const message = result.syncOk
    ? 'Demande renvoyée à la logistique. En attente de validation.'
    : 'Échec du renvoi. Vérifiez la configuration VAN Logistique.';
  return success(res, result.entity, message);
});

/** Webhook VAN Logistique — pas de JWT utilisateur */
exports.externalDecide = asyncHandler(async (req, res) => {
  const result = await equipmentRequestService.applyExternalDecision(req.body);
  if (!result.ok) {
    if (result.code === 404) return notFound(res, result.message);
    return badRequest(res, result.message);
  }

  console.log(
    `[VAN LOGISTIQUE] Décision ${result.entity.status} pour ${result.entity.ref}`,
    result.alreadyProcessed ? '(déjà traitée)' : '',
  );

  return success(
    res,
    result.entity,
    result.alreadyProcessed ? 'Demande déjà traitée' : `Demande ${result.entity.status.toLowerCase()}`,
  );
});
