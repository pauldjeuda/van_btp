const db = require('../models');
const { formatQty } = require('../utils/formatNumbers');

const normalizeProjectId = (raw) => (Number(raw) === 0 ? null : raw);

function computeBalanceFromList(movements, itemName) {
  return movements
    .filter((m) => m.item === itemName)
    .reduce((acc, m) => {
      const qty = parseFloat(m.quantity || 0);
      if (m.type === 'Entrée') return acc + qty;
      if (m.type === 'Sortie' || m.type === 'Transfert') return acc - qty;
      return acc;
    }, 0);
}

async function getBalance(itemName, projectId, transaction) {
  const pid = normalizeProjectId(projectId);
  const movements = await db.StockMovement.findAll({
    where: { item: itemName, projectId: pid },
    transaction,
  });
  return computeBalanceFromList(movements, itemName);
}

/**
 * Coût moyen pondéré (CMP) à partir des entrées valorisées et sorties.
 */
async function resolveAvgUnitCost(itemName, projectId, transaction) {
  const pid = normalizeProjectId(projectId);
  const movements = await db.StockMovement.findAll({
    where: { item: itemName, projectId: pid },
    order: [['movementDate', 'ASC'], ['id', 'ASC']],
    transaction,
  });

  let totalQty = 0;
  let totalVal = 0;

  for (const m of movements) {
    const q = parseFloat(m.quantity || 0);
    if (m.type === 'Entrée') {
      const uc = parseFloat(m.unitCost || 0);
      totalVal += q * uc;
      totalQty += q;
    } else if (m.type === 'Sortie' || m.type === 'Transfert') {
      const avg = totalQty > 0 ? totalVal / totalQty : 0;
      totalVal -= q * avg;
      totalQty -= q;
    }
  }

  return totalQty > 0 ? totalVal / totalQty : 0;
}

async function createMovement({
  type,
  materialId,
  item,
  quantity,
  unit,
  projectId,
  movementDate,
  unitCost,
  sourceType,
  sourceId,
  note,
  createdBy,
  transaction,
}) {
  let itemName = item?.trim();
  let material = null;

  if (materialId) {
    material = await db.StockMaterial.findByPk(materialId, { transaction });
    if (!material) throw new Error('Matériau introuvable');
    itemName = material.name;
  }
  if (!itemName) throw new Error('Article ou materialId obligatoire');

  const qty = parseFloat(quantity);
  if (!qty || qty <= 0) throw new Error('Quantité invalide');

  const pid = normalizeProjectId(projectId);

  if (type === 'Sortie' || type === 'Transfert') {
    const solde = await getBalance(itemName, projectId, transaction);
    if (qty > solde + 0.0001) {
      throw new Error(
        `Stock insuffisant pour "${itemName}". Disponible : ${formatQty(Math.max(0, solde))}, demandé : ${formatQty(qty)}.`,
      );
    }
  }

  let resolvedUnitCost = unitCost != null ? parseFloat(unitCost) : null;
  if (resolvedUnitCost == null && (type === 'Sortie' || type === 'Transfert')) {
    resolvedUnitCost = await resolveAvgUnitCost(itemName, projectId, transaction);
  }

  const movement = await db.StockMovement.create({
    type,
    item: itemName,
    materialId: materialId || material?.id || null,
    quantity: qty,
    unit: unit || material?.unit || '',
    movementDate,
    projectId: pid,
    warehouse: 'Magasin Principal',
    unitCost: resolvedUnitCost,
    sourceType: sourceType || null,
    sourceId: sourceId || null,
    note,
    createdBy,
  }, { transaction });

  return movement;
}

module.exports = {
  normalizeProjectId,
  getBalance,
  resolveAvgUnitCost,
  createMovement,
  computeBalanceFromList,
};
