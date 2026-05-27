const db = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest, error } = require('../utils/response');

const normalizeProjectId = (raw) => (Number(raw) === 0 ? null : raw);

function computeStockFromMovements(itemName, movements) {
  return movements
    .filter((m) => m.item === itemName)
    .reduce((acc, m) => {
      const qty = parseFloat(m.quantity || 0);
      if (m.type === 'Entrée') return acc + qty;
      if (m.type === 'Sortie' || m.type === 'Transfert') return acc - qty;
      return acc;
    }, 0);
}

function resolveStatus(stock, threshold) {
  const t = parseFloat(threshold || 0);
  if (stock <= 0) return 'empty';
  if (t > 0 && stock <= t) return 'alert';
  return 'ok';
}

function resolveLevelPercent(stock, threshold) {
  const t = parseFloat(threshold || 0);
  if (t <= 0) return stock > 0 ? 100 : 0;
  return Math.min(100, Math.round((stock / t) * 100));
}

async function assertChefProjectAccess(req, projectId) {
  if (req.role !== 'Chef_chantier') return true;
  if (projectId === null || projectId === undefined) return true;
  const project = await db.Project.findByPk(projectId);
  if (!project || project.chefId !== req.user.id) return false;
  return true;
}

exports.getInventory = asyncHandler(async (req, res) => {
  if (req.query.projectId === undefined || req.query.projectId === '') {
    return badRequest(res, 'projectId requis (0 = magasin central)');
  }

  const projectId = normalizeProjectId(req.query.projectId);

  if (req.role === 'Chef_chantier' && projectId === null) {
    return badRequest(res, 'Le magasin central n\'est pas accessible aux chefs de chantier');
  }

  if (req.role === 'Chef_chantier' && projectId !== null) {
    const ok = await assertChefProjectAccess(req, projectId);
    if (!ok) return success(res, { items: [], stats: { alert: 0, ok: 0, movementsThisMonth: 0, totalMaterials: 0 } });
  }

  const isWarehouseView = projectId === null;

  // Catalogue unique au magasin central ; le stock affiché suit le périmètre (magasin ou chantier)
  const catalogMaterials = await db.StockMaterial.findAll({
    where: { projectId: null },
    order: [['name', 'ASC']],
  });

  const movementWhere = isWarehouseView ? { projectId: null } : { projectId };
  const movements = await db.StockMovement.findAll({ where: movementWhere });

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const movementsThisMonth = movements.filter((m) => m.movementDate >= monthStartStr).length;

  const catalogNames = new Set(catalogMaterials.map((m) => m.name));
  const movementOnlyNames = [
    ...new Set(movements.map((m) => m.item).filter((name) => name && !catalogNames.has(name))),
  ];

  const syntheticRows = movementOnlyNames.map((name) => {
    const sample = movements.find((m) => m.item === name);
    return {
      id: null,
      name,
      category: 'Autre',
      unit: sample?.unit || 'Unités',
      alertThreshold: 0,
      projectId: 0,
    };
  });

  const allCatalog = [...catalogMaterials.map((m) => m.toJSON()), ...syntheticRows];

  const items = allCatalog.map((data) => {
    const currentStock = computeStockFromMovements(data.name, movements);
    const status = resolveStatus(currentStock, data.alertThreshold);
    return {
      ...data,
      projectId: 0,
      currentStock,
      status,
      levelPercent: resolveLevelPercent(currentStock, data.alertThreshold),
    };
  });

  let alert = 0;
  let ok = 0;
  items.forEach((row) => {
    if (row.status === 'alert') alert += 1;
    else if (row.status === 'ok') ok += 1;
  });

  return success(res, {
    items,
    stats: {
      alert,
      ok,
      movementsThisMonth,
      totalMaterials: items.length,
    },
  });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, category, unit, alertThreshold, projectId } = req.body;
  if (!name?.trim() || !unit?.trim()) {
    return badRequest(res, 'Nom et unité obligatoires');
  }

  if (req.role === 'Chef_chantier') {
    return badRequest(res, 'Les matériaux se créent depuis le magasin central');
  }

  const pid = null;

  try {
    const material = await db.StockMaterial.create({
      name: name.trim(),
      category: category || 'Matériaux',
      unit: unit.trim(),
      alertThreshold: alertThreshold ?? 0,
      projectId: pid,
      createdBy: req.user.id,
    });

    try {
      await db.Log.create({
        action: `Matériau créé : ${material.name}`,
        module: 'Stock',
        entityType: 'StockMaterial',
        entityId: material.id,
        userId: req.user.id,
        userRole: req.role,
        userMatricule: req.user.matricule,
      });
    } catch (logErr) {
      console.warn('[Stock] Journal audit matériau:', logErr.message);
    }

    const json = material.toJSON();
    if (json.projectId === null) json.projectId = 0;
    return created(res, json, 'Matériau enregistré');
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return badRequest(res, 'Un matériau avec ce nom existe déjà pour ce périmètre');
    }
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
});

exports.update = asyncHandler(async (req, res) => {
  const material = await db.StockMaterial.findByPk(req.params.id);
  if (!material) return notFound(res, 'Matériau introuvable');

  if (req.role === 'Chef_chantier') {
    const ok = await assertChefProjectAccess(req, material.projectId);
    if (!ok) return badRequest(res, 'Accès refusé');
  } else if (req.role !== 'Gestionnaire de stocks' && req.role !== 'Directeur technique') {
    return badRequest(res, 'Accès refusé');
  }

  const { name, category, unit, alertThreshold } = req.body;
  if (name !== undefined) material.name = name.trim();
  if (category !== undefined) material.category = category;
  if (unit !== undefined) material.unit = unit.trim();
  if (alertThreshold !== undefined) material.alertThreshold = alertThreshold;

  await material.save();
  const json = material.toJSON();
  if (json.projectId === null) json.projectId = 0;
  return success(res, json, 'Matériau mis à jour');
});

exports.remove = asyncHandler(async (req, res) => {
  const material = await db.StockMaterial.findByPk(req.params.id);
  if (!material) return notFound(res, 'Matériau introuvable');

  if (req.role !== 'Gestionnaire de stocks' && req.role !== 'Directeur technique') {
    return badRequest(res, 'Accès refusé');
  }

  await material.destroy();
  return success(res, null, 'Matériau supprimé');
});
