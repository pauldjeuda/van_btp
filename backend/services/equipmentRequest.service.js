const db = require('../models');
const vanLogistique = require('./vanLogistique.service');

const TERMINAL_STATUSES = ['Approuvée', 'Rejetée', 'Annulée'];
const PROJECT_INCLUDE = [{ model: db.Project, as: 'project', attributes: ['id', 'name', 'code'] }];

const generateRef = () => `DEM-ENG-${Date.now()}`;

/** MySQL renvoie parfois logisticsDetails en chaîne JSON — normaliser pour l'API */
const parseLogisticsDetails = (value) => {
  if (value == null) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
};

const serializeRequest = (row) => {
  const plain = row?.get ? row.get({ plain: true }) : { ...row };
  plain.logisticsDetails = parseLogisticsDetails(plain.logisticsDetails);
  return plain;
};

const requesterDisplayName = (user) => {
  const parts = [user?.prenom, user?.nom].filter(Boolean);
  return parts.length ? parts.join(' ') : user?.matricule || 'Demandeur';
};

exports.buildListWhere = async (req) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.projectId) where.projectId = req.query.projectId;

  if (req.role === 'Chef_chantier') {
    if (req.query.mine === 'true') {
      where.requestedBy = req.user.id;
    } else {
      const projects = await db.Project.findAll({
        where: { chefId: req.user.id },
        attributes: ['id'],
      });
      const ids = projects.map((p) => p.id);
      where.projectId = req.query.projectId
        ? Number(req.query.projectId)
        : ids.length
          ? ids
          : [-1];
    }
  }

  return where;
};

exports.list = async (req) => {
  const where = await exports.buildListWhere(req);
  const rows = await db.EquipmentRequest.findAll({
    where,
    include: PROJECT_INCLUDE,
    order: [['createdAt', 'DESC']],
  });
  return rows.map(serializeRequest);
};

exports.getById = async (id, req) => {
  const row = await db.EquipmentRequest.findByPk(id, { include: PROJECT_INCLUDE });
  if (!row) return { ok: false, code: 404, message: 'Demande introuvable' };

  if (req.role === 'Chef_chantier' && row.requestedBy !== req.user.id) {
    const project = await db.Project.findByPk(row.projectId);
    if (!project || project.chefId !== req.user.id) {
      return { ok: false, code: 403, message: 'Accès refusé à cette demande' };
    }
  }

  return { ok: true, entity: serializeRequest(row) };
};

exports.create = async (body, req) => {
  const { needDescription, desiredDate, projectId } = body;

  if (!needDescription?.trim() || needDescription.trim().length < 10) {
    return { ok: false, code: 400, message: 'La description doit contenir au moins 10 caractères' };
  }
  if (!desiredDate) {
    return { ok: false, code: 400, message: 'La date souhaitée est obligatoire' };
  }
  if (!projectId) {
    return { ok: false, code: 400, message: 'Le chantier est obligatoire' };
  }

  const project = await db.Project.findByPk(projectId);
  if (!project) return { ok: false, code: 400, message: 'Chantier introuvable' };

  if (req.role === 'Chef_chantier' && project.chefId !== req.user.id) {
    return { ok: false, code: 403, message: 'Ce chantier ne vous est pas assigné' };
  }

  const today = new Date().toISOString().split('T')[0];
  if (desiredDate < today) {
    return { ok: false, code: 400, message: 'La date souhaitée ne peut pas être dans le passé' };
  }

  const description = needDescription.trim();

  const request = await db.EquipmentRequest.create({
    ref: generateRef(),
    equipmentRequested: description.slice(0, 200),
    needDescription: description,
    desiredDate,
    status: 'En attente',
    projectId,
    requestedBy: req.user.id,
    requesterMatricule: req.user.matricule,
    requesterName: requesterDisplayName(req.user),
  });

  console.log('[EQUIPMENT REQUEST] Demande créée en BDD — envoi VAN Logistique…', {
    id: request.id,
    ref: request.ref,
    projectId,
    desiredDate,
    descriptionLen: description.length,
    user: req.user?.matricule,
  });

  const sync = await vanLogistique.sendEquipmentRequest({
    id: request.id,
    ref: request.ref,
    needDescription: description,
    desiredDate,
  });
  const now = new Date();

  if (sync.ok) {
    console.log('[EQUIPMENT REQUEST] Sync logistique OK', {
      ref: request.ref,
      externalId: sync.externalId,
      mocked: Boolean(sync.mocked),
    });
    await request.update({
      externalId: sync.externalId,
      lastSyncAt: now,
      syncError: null,
      // Reste « En attente » jusqu'à la décision logistique
      status: 'En attente',
    });
  } else {
    console.error('[EQUIPMENT REQUEST] Sync logistique ÉCHEC', {
      ref: request.ref,
      error: sync.error,
    });
    await request.update({
      status: 'Erreur envoi',
      syncError: sync.error || 'Échec envoi vers VAN Logistique',
      lastSyncAt: now,
    });
  }

  const entity = await db.EquipmentRequest.findByPk(request.id, { include: PROJECT_INCLUDE });
  return { ok: true, entity: serializeRequest(entity), syncOk: sync.ok };
};

exports.cancel = async (id, req) => {
  const found = await exports.getById(id, req);
  if (!found.ok) return found;

  const { entity } = found;
  if (!['En attente', 'Erreur envoi'].includes(entity.status)) {
    return { ok: false, code: 400, message: 'Cette demande ne peut plus être annulée' };
  }

  if (req.role === 'Chef_chantier' && entity.requestedBy !== req.user.id) {
    return { ok: false, code: 403, message: 'Seul le demandeur peut annuler' };
  }

  const row = await db.EquipmentRequest.findByPk(id);
  const refLogistique = row.externalId;

  if (entity.status === 'En attente' && refLogistique) {
    const vlCancel = await vanLogistique.cancelEquipmentRequest(refLogistique);
    if (!vlCancel.ok) {
      const detail = vlCancel.details ? ` Détail : ${vlCancel.details}` : '';
      return {
        ok: false,
        code: 502,
        message: (vlCancel.error || 'Impossible d\'annuler la demande chez VAN Logistique') + detail,
      };
    }
  }

  await row.update({
    status: 'Annulée',
    syncError: null,
  });
  return { ok: true, entity: serializeRequest(row) };
};

exports.retrySend = async (id, req) => {
  const found = await exports.getById(id, req);
  if (!found.ok) return found;

  const { entity } = found;
  if (entity.status !== 'Erreur envoi') {
    return { ok: false, code: 400, message: 'Seules les demandes en erreur d\'envoi peuvent être relancées' };
  }

  const row = await db.EquipmentRequest.findByPk(id);
  const plain = row.get({ plain: true });
  console.log('[EQUIPMENT REQUEST] Relance envoi VAN Logistique…', {
    id: plain.id,
    ref: plain.ref,
    syncError: plain.syncError,
  });
  const sync = await vanLogistique.sendEquipmentRequest({
    id: plain.id,
    ref: plain.ref,
    needDescription: plain.needDescription || plain.equipmentRequested,
    desiredDate: plain.desiredDate,
  });
  const now = new Date();

  if (sync.ok) {
    console.log('[EQUIPMENT REQUEST] Relance OK', { ref: plain.ref, externalId: sync.externalId });
    await row.update({
      externalId: sync.externalId,
      status: 'En attente',
      syncError: null,
      lastSyncAt: now,
    });
  } else {
    console.error('[EQUIPMENT REQUEST] Relance ÉCHEC', { ref: plain.ref, error: sync.error });
    await row.update({
      syncError: sync.error,
      lastSyncAt: now,
    });
  }

  const refreshed = await db.EquipmentRequest.findByPk(row.id, { include: PROJECT_INCLUDE });
  return { ok: true, entity: serializeRequest(refreshed), syncOk: sync.ok };
};

const parseDecision = (payload) => {
  const raw = String(payload.decision || payload.status || '').toLowerCase();
  if (['approve', 'approved', 'approuvee', 'approuvée'].includes(raw)) return 'approved';
  if (['reject', 'rejected', 'rejetée', 'rejetee', 'rejete'].includes(raw)) return 'rejected';
  return null;
};

/**
 * Décision VAN Logistique (webhook) — corps JSON complet conservé dans logisticsDetails
 */
exports.applyExternalDecision = async (payload) => {
  const {
    btpRequestId,
    correlationId,
    externalId,
    reference,
    rejectionReason,
    respondedBy,
    respondedAt,
  } = payload || {};

  const where = {};
  if (btpRequestId) where.id = btpRequestId;
  else if (externalId) where.externalId = String(externalId);
  else if (reference) {
    where[db.Sequelize.Op.or] = [
      { externalId: String(reference) },
      { ref: String(reference) },
    ];
  } else if (correlationId) where.ref = correlationId;
  else {
    return { ok: false, code: 400, message: 'Identifiant manquant (reference, externalId, btpRequestId ou correlationId)' };
  }

  const entity = await db.EquipmentRequest.findOne({ where });
  if (!entity) return { ok: false, code: 404, message: 'Demande introuvable' };

  if (TERMINAL_STATUSES.includes(entity.status)) {
    if (!entity.logisticsDetails && payload) {
      await entity.update({
        logisticsDetails: { ...payload, receivedAt: new Date().toISOString() },
        respondedBy: payload.driverName || entity.respondedBy,
      });
    }
    const refreshed = await db.EquipmentRequest.findByPk(entity.id, { include: PROJECT_INCLUDE });
    return { ok: true, entity: serializeRequest(refreshed), alreadyProcessed: true };
  }

  if (entity.status !== 'En attente') {
    return { ok: false, code: 400, message: `Demande non traitable (statut actuel : ${entity.status})` };
  }

  const decisionKind = parseDecision(payload);
  if (!decisionKind) {
    return { ok: false, code: 400, message: 'decision/status invalide (approved ou rejected attendu)' };
  }

  const isApprove = decisionKind === 'approved';
  const logisticsDetails = { ...payload, receivedAt: new Date().toISOString() };

  const updates = {
    status: isApprove ? 'Approuvée' : 'Rejetée',
    rejectionReason: isApprove
      ? null
      : (rejectionReason || payload.rejectionReason || 'Demande refusée par la logistique'),
    respondedBy: respondedBy || payload.driverName || 'VAN Logistique',
    respondedAt: respondedAt ? new Date(respondedAt) : new Date(),
    logisticsDetails,
  };

  await entity.update(updates);
  const refreshed = await db.EquipmentRequest.findByPk(entity.id, { include: PROJECT_INCLUDE });
  return { ok: true, entity: serializeRequest(refreshed) };
};
