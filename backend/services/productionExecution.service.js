const { Op } = require('sequelize');
const db = require('../models');
const stockMovement = require('./stockMovement.service');
const { formatQty } = require('../utils/formatNumbers');

const RECIPE_INCLUDE = [
  {
    model: db.ProductionRecipeLine,
    as: 'lines',
    separate: true,
    order: [['sortOrder', 'ASC']],
    include: [{ model: db.StockMaterial, as: 'material' }],
  },
  { model: db.StockMaterial, as: 'finishedMaterial' },
];

function computeBatches(quantityProduced, expectedOutput) {
  const out = parseFloat(quantityProduced || 0);
  const expected = parseFloat(expectedOutput || 1);
  if (expected <= 0) return 1;
  return out / expected;
}

function buildConsumptionPlan(recipe, quantityProduced, overrides = []) {
  const batches = computeBatches(quantityProduced, recipe.expectedOutput);
  const overrideMap = new Map((overrides || []).map((o) => [Number(o.materialId), parseFloat(o.quantityActual)]));

  return (recipe.lines || []).map((line) => {
    const theoretical = parseFloat(line.quantityPerBatch) * batches;
    const actual = overrideMap.has(line.materialId)
      ? overrideMap.get(line.materialId)
      : theoretical;
    return {
      materialId: line.materialId,
      material: line.material,
      quantityTheoretical: theoretical,
      quantityActual: actual,
      unit: line.unit || line.material?.unit,
    };
  });
}

/** Crée ou met à jour le matériau produit fini = nom de la recette (catalogue central). */
async function syncFinishedMaterial(name, outputUnit, userId, existingMaterialId, transaction) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nom de recette / produit fini obligatoire');

  if (existingMaterialId) {
    const mat = await db.StockMaterial.findByPk(existingMaterialId, { transaction });
    if (mat) {
      if (mat.name !== trimmed || (outputUnit && mat.unit !== outputUnit)) {
        mat.name = trimmed;
        if (outputUnit) mat.unit = outputUnit;
        await mat.save({ transaction });
      }
      return mat.id;
    }
  }

  let mat = await db.StockMaterial.findOne({
    where: { name: trimmed, projectId: null },
    transaction,
  });
  if (!mat) {
    mat = await db.StockMaterial.create({
      name: trimmed,
      category: 'Autre',
      unit: outputUnit || 'unité',
      alertThreshold: 0,
      projectId: null,
      createdBy: userId,
    }, { transaction });
  } else if (outputUnit && mat.unit !== outputUnit) {
    mat.unit = outputUnit;
    await mat.save({ transaction });
  }
  return mat.id;
}

async function previewRecipe(recipeId, quantityProduced, overrides) {
  const recipe = await db.ProductionRecipe.findByPk(recipeId, { include: RECIPE_INCLUDE });
  if (!recipe) throw new Error('Recette introuvable');
  const plan = buildConsumptionPlan(recipe, quantityProduced, overrides);
  const projectId = 0;

  const lines = await Promise.all(
    plan.map(async (row) => {
      const name = row.material?.name;
      const available = name
        ? await stockMovement.getBalance(name, projectId)
        : 0;
      return {
        ...row,
        availableStock: available,
        sufficient: available >= row.quantityActual - 0.0001,
      };
    }),
  );

  return { recipe, batches: computeBatches(quantityProduced, recipe.expectedOutput), lines };
}

async function validateEntry(entryId, req) {
  const transaction = await db.sequelize.transaction();
  try {
    const entry = await db.ProductionEntry.findByPk(entryId, {
      include: [
        { model: db.ProductionRecipe, as: 'recipe', include: RECIPE_INCLUDE },
        { model: db.ProductionEntryConsumption, as: 'consumptions' },
      ],
      transaction,
    });

    if (!entry) throw new Error('Production introuvable');
    if (entry.status === 'validee') throw new Error('Production déjà validée');
    if (entry.status === 'annulee') throw new Error('Production annulée');
    if (!entry.recipeId || !entry.recipe) {
      throw new Error('Validation stock : recette obligatoire');
    }

    const recipe = entry.recipe;
    let finishedMaterialId = entry.finishedMaterialId || recipe.finishedMaterialId;
    if (!finishedMaterialId) {
      finishedMaterialId = await syncFinishedMaterial(
        recipe.name,
        recipe.outputUnit || entry.unit,
        req.user.id,
        null,
        transaction,
      );
      await recipe.update({ finishedMaterialId }, { transaction });
    }
    const projectId = entry.projectId != null ? entry.projectId : 0;
    const qtyProduced = parseFloat(entry.quantity || 0);
    const lossQty = parseFloat(entry.lossQty || 0);
    const netOutput = Math.max(0, qtyProduced - lossQty);

    if (netOutput <= 0) throw new Error('Quantité nette produite invalide');

    const overrides = (entry.consumptions || []).map((c) => ({
      materialId: c.materialId,
      quantityActual: c.quantityActual,
    }));

    const plan = buildConsumptionPlan(recipe, qtyProduced, overrides);

    for (const row of plan) {
      const name = row.material?.name;
      if (!name) throw new Error('Matériau de recette introuvable');
      const solde = await stockMovement.getBalance(name, projectId, transaction);
      if (row.quantityActual > solde + 0.0001) {
        throw new Error(
          `Stock insuffisant : ${name} (dispo ${formatQty(solde)}, besoin ${formatQty(row.quantityActual)})`,
        );
      }
    }

    await db.ProductionEntryConsumption.destroy({ where: { entryId: entry.id }, transaction });

    let materialCost = 0;
    const consumptionRows = [];

    for (const row of plan) {
      const unitCost = await stockMovement.resolveAvgUnitCost(
        row.material.name,
        projectId,
        transaction,
      );
      const totalValue = row.quantityActual * unitCost;
      materialCost += totalValue;

      const mov = await stockMovement.createMovement({
        type: 'Sortie',
        materialId: row.materialId,
        quantity: row.quantityActual,
        unit: row.unit,
        projectId,
        movementDate: entry.productionDate,
        unitCost,
        sourceType: 'production',
        sourceId: entry.id,
        note: `Consommation production #${entry.id} — ${recipe.name}`,
        createdBy: req.user.id,
        transaction,
      });

      const cons = await db.ProductionEntryConsumption.create({
        entryId: entry.id,
        materialId: row.materialId,
        quantityTheoretical: row.quantityTheoretical,
        quantityActual: row.quantityActual,
        unitCost,
        totalValue,
        stockMovementId: mov.id,
      }, { transaction });

      consumptionRows.push(cons);
    }

    const laborCost = parseFloat(entry.laborCost || 0);
    const fuelCost = parseFloat(entry.fuelCost || 0);
    const maintenanceCost = parseFloat(entry.maintenanceCost || 0);
    const totalCost = materialCost + laborCost + fuelCost + maintenanceCost;
    const unitCostFinished = netOutput > 0 ? totalCost / netOutput : 0;

    const finishedMaterialIdResolved = entry.finishedMaterialId || recipe.finishedMaterialId || finishedMaterialId;
    if (!finishedMaterialIdResolved) {
      throw new Error('Matériau produit fini non défini sur la recette');
    }

    const finishedMat = await db.StockMaterial.findByPk(finishedMaterialIdResolved, { transaction });
    if (!finishedMat) throw new Error('Produit fini introuvable dans le catalogue stock');

    await stockMovement.createMovement({
      type: 'Entrée',
      materialId: finishedMaterialIdResolved,
      quantity: netOutput,
      unit: entry.unit || recipe.outputUnit || finishedMat.unit,
      projectId,
      movementDate: entry.productionDate,
      unitCost: unitCostFinished,
      sourceType: 'production',
      sourceId: entry.id,
      note: `Production validée #${entry.id} — ${recipe.name}`,
      createdBy: req.user.id,
      transaction,
    });

    const expected = parseFloat(recipe.expectedOutput || 1);
    const yieldRatio = expected > 0 ? qtyProduced / (expected * computeBatches(qtyProduced, expected)) : 1;

    await entry.update({
      status: 'validee',
      materialCost,
      totalCost,
      unitCost: unitCostFinished,
      yieldRatio,
      finishedMaterialId: finishedMaterialIdResolved,
    }, { transaction });

    await db.Log.create({
      action: `Production validée #${entry.id} : ${netOutput} ${entry.unit} — coût ${Math.round(totalCost)} FCFA`,
      module: 'Production',
      entityType: 'ProductionEntry',
      entityId: entry.id,
      userId: req.user.id,
      userRole: req.role,
      userMatricule: req.user.matricule,
    }, { transaction });

    await transaction.commit();

    return db.ProductionEntry.findByPk(entry.id, {
      include: [
        { model: db.ProductionRecipe, as: 'recipe' },
        {
          model: db.ProductionEntryConsumption,
          as: 'consumptions',
          include: [{ model: db.StockMaterial, as: 'material' }],
        },
      ],
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function getFinishedStockByMaterialId(materialId, projectId = 0) {
  if (!materialId) return null;
  const mat = await db.StockMaterial.findByPk(materialId);
  if (!mat) return null;

  const stock = await stockMovement.getBalance(mat.name, projectId);
  return { materialId: mat.id, name: mat.name, stock, unit: mat.unit };
}

async function getFinishedStock(productType, projectId = 0) {
  const recipe = await db.ProductionRecipe.findOne({
    where: { productType, isActive: true, finishedMaterialId: { [Op.ne]: null } },
    order: [['id', 'DESC']],
  });
  if (!recipe?.finishedMaterialId) return null;
  return getFinishedStockByMaterialId(recipe.finishedMaterialId, projectId);
}

module.exports = {
  RECIPE_INCLUDE,
  computeBatches,
  buildConsumptionPlan,
  syncFinishedMaterial,
  previewRecipe,
  validateEntry,
  getFinishedStock,
  getFinishedStockByMaterialId,
};
