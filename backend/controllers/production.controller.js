const { Op } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest } = require('../utils/response');
const productionExecution = require('../services/productionExecution.service');
const stockMovement = require('../services/stockMovement.service');

const PRODUCT_TYPES = ['Parpaing', 'Pavé', 'Bordure', 'Hourdi', 'Autre'];

const logAction = (action, entityType, entityId, req) =>
  db.Log.create({
    action, module: 'Production', entityType, entityId,
    userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
  });

const buildDateFilter = (from, to) => {
  if (from && to) return { [Op.between]: [from, to] };
  if (from) return { [Op.gte]: from };
  return undefined;
};

const ENTRY_INCLUDE = [
  { model: db.ProductionRecipe, as: 'recipe', attributes: ['id', 'name', 'expectedOutput', 'outputUnit'] },
  {
    model: db.ProductionEntryConsumption,
    as: 'consumptions',
    include: [{ model: db.StockMaterial, as: 'material', attributes: ['id', 'name', 'unit'] }],
  },
  { model: db.StockMaterial, as: 'finishedMaterial', attributes: ['id', 'name', 'unit'] },
];

// ─── Matériaux (lecture stock usine pour gérant production) ───────────────────

exports.getMaterials = asyncHandler(async (req, res) => {
  const projectId = req.query.projectId != null ? Number(req.query.projectId) : 0;
  const catalog = await db.StockMaterial.findAll({
    where: { projectId: null },
    order: [['name', 'ASC']],
  });
  const pid = stockMovement.normalizeProjectId(projectId);
  const movements = await db.StockMovement.findAll({ where: { projectId: pid } });

  const items = catalog.map((m) => {
    const currentStock = stockMovement.computeBalanceFromList(movements, m.name);
    return { ...m.toJSON(), projectId: 0, currentStock };
  });

  return success(res, items);
});

// ─── Recettes ─────────────────────────────────────────────────────────────────

exports.getRecipes = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.active === '1') where.isActive = true;
  if (req.query.productType) where.productType = req.query.productType;

  const recipes = await db.ProductionRecipe.findAll({
    where,
    include: productionExecution.RECIPE_INCLUDE,
    order: [['name', 'ASC']],
  });
  return success(res, recipes);
});

exports.getRecipeById = asyncHandler(async (req, res) => {
  const recipe = await db.ProductionRecipe.findByPk(req.params.id, {
    include: productionExecution.RECIPE_INCLUDE,
  });
  if (!recipe) return notFound(res, 'Recette introuvable');
  return success(res, recipe);
});

exports.createRecipe = asyncHandler(async (req, res) => {
  const { name, productType, lines, expectedOutput } = req.body;
  if (!name?.trim() || !productType || !expectedOutput) {
    return badRequest(res, 'Nom, type produit et quantité de production obligatoires');
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return badRequest(res, 'Au moins une ligne de matière première');
  }

  const transaction = await db.sequelize.transaction();
  try {
    const finishedMaterialId = await productionExecution.syncFinishedMaterial(
      name.trim(),
      req.body.outputUnit || 'unité',
      req.user.id,
      null,
      transaction,
    );

    const recipe = await db.ProductionRecipe.create({
      name: name.trim(),
      productType,
      productLabel: req.body.productLabel || name.trim(),
      expectedOutput,
      outputUnit: req.body.outputUnit || 'unité',
      estimatedCost: req.body.estimatedCost || 0,
      finishedMaterialId,
      isActive: req.body.isActive !== false,
      createdBy: req.user.id,
    }, { transaction });

    await Promise.all(
      lines.map((line, idx) =>
        db.ProductionRecipeLine.create({
          recipeId: recipe.id,
          materialId: line.materialId,
          quantityPerBatch: line.quantityPerBatch,
          unit: line.unit,
          sortOrder: line.sortOrder ?? idx,
        }, { transaction }),
      ),
    );

    await logAction(`Recette créée : ${recipe.name}`, 'ProductionRecipe', recipe.id, req);
    await transaction.commit();

    const full = await db.ProductionRecipe.findByPk(recipe.id, { include: productionExecution.RECIPE_INCLUDE });
    return created(res, full, 'Recette enregistrée');
  } catch (err) {
    await transaction.rollback();
    if (err.name === 'SequelizeUniqueConstraintError') {
      return badRequest(res, 'Un matériau ou une recette avec ce nom existe déjà');
    }
    return badRequest(res, err.message || 'Erreur lors de la création');
  }
});

exports.updateRecipe = asyncHandler(async (req, res) => {
  const recipe = await db.ProductionRecipe.findByPk(req.params.id);
  if (!recipe) return notFound(res, 'Recette introuvable');

  const transaction = await db.sequelize.transaction();
  try {
    const fields = ['productType', 'productLabel', 'expectedOutput', 'outputUnit', 'estimatedCost', 'isActive'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) recipe[f] = req.body[f];
    });
    if (req.body.name) recipe.name = req.body.name.trim();

    recipe.finishedMaterialId = await productionExecution.syncFinishedMaterial(
      recipe.name,
      recipe.outputUnit || 'unité',
      req.user.id,
      recipe.finishedMaterialId,
      transaction,
    );

    await recipe.save({ transaction });

    if (Array.isArray(req.body.lines)) {
      await db.ProductionRecipeLine.destroy({ where: { recipeId: recipe.id }, transaction });
      await Promise.all(
        req.body.lines.map((line, idx) =>
          db.ProductionRecipeLine.create({
            recipeId: recipe.id,
            materialId: line.materialId,
            quantityPerBatch: line.quantityPerBatch,
            unit: line.unit,
            sortOrder: line.sortOrder ?? idx,
          }, { transaction }),
        ),
      );
    }

    await transaction.commit();
    const full = await db.ProductionRecipe.findByPk(recipe.id, { include: productionExecution.RECIPE_INCLUDE });
    return success(res, full, 'Recette mise à jour');
  } catch (err) {
    await transaction.rollback();
    return badRequest(res, err.message || 'Erreur lors de la mise à jour');
  }
});

exports.deleteRecipe = asyncHandler(async (req, res) => {
  const recipe = await db.ProductionRecipe.findByPk(req.params.id);
  if (!recipe) return notFound(res, 'Recette introuvable');
  await recipe.destroy();
  return success(res, null, 'Recette supprimée');
});

exports.previewRecipe = asyncHandler(async (req, res) => {
  const quantityProduced = parseFloat(req.query.quantityProduced || req.body.quantityProduced);
  if (!quantityProduced || quantityProduced <= 0) {
    return badRequest(res, 'quantityProduced obligatoire');
  }
  const preview = await productionExecution.previewRecipe(
    req.params.id,
    quantityProduced,
    req.body.overrides,
  );
  return success(res, preview);
});

// ─── Productions ──────────────────────────────────────────────────────────────

exports.getAllEntries = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.productType) where.productType = req.query.productType;
  if (req.query.status) where.status = req.query.status;
  const dateFilter = buildDateFilter(req.query.from, req.query.to);
  if (dateFilter) where.productionDate = dateFilter;

  const entries = await db.ProductionEntry.findAll({
    where,
    include: ENTRY_INCLUDE,
    order: [['productionDate', 'DESC'], ['id', 'DESC']],
  });
  return success(res, entries);
});

exports.createEntry = asyncHandler(async (req, res) => {
  const { productType, quantity, productionDate, recipeId } = req.body;
  const qty = parseFloat(quantity);

  if (recipeId) {
    if (!productionDate || !Number.isFinite(qty) || qty <= 0) {
      return badRequest(res, 'Recette, quantité et date sont obligatoires');
    }

    const recipe = await db.ProductionRecipe.findByPk(recipeId, { include: productionExecution.RECIPE_INCLUDE });
    if (!recipe) return notFound(res, 'Recette introuvable');

    const entry = await db.ProductionEntry.create({
      productType: recipe.productType,
      productLabel: req.body.productLabel || recipe.productLabel || recipe.name,
      quantity: qty,
      unit: req.body.unit || recipe.outputUnit || 'unité',
      productionDate,
      note: req.body.note,
      recipeId: recipe.id,
      projectId: req.body.projectId != null ? Number(req.body.projectId) : 0,
      lossQty: req.body.lossQty || 0,
      finishedMaterialId: recipe.finishedMaterialId,
      status: 'brouillon',
      unitCost: 0,
      createdBy: req.user.id,
    });

    const plan = productionExecution.buildConsumptionPlan(recipe, qty, req.body.consumptionOverrides);
    await Promise.all(
      plan.map((row) =>
        db.ProductionEntryConsumption.create({
          entryId: entry.id,
          materialId: row.materialId,
          quantityTheoretical: row.quantityTheoretical,
          quantityActual: row.quantityActual,
        }),
      ),
    );

    await logAction(
      `Production brouillon : ${qty} ${entry.unit} — ${recipe.name}`,
      'ProductionEntry', entry.id, req,
    );

    const full = await db.ProductionEntry.findByPk(entry.id, { include: ENTRY_INCLUDE });
    return created(res, full, 'Production enregistrée (brouillon — validez pour déduire le stock)');
  }

  if (!productType || !Number.isFinite(qty) || qty <= 0 || !productionDate) {
    return badRequest(res, 'Type, quantité et date sont obligatoires');
  }

  const entry = await db.ProductionEntry.create({
    ...req.body,
    quantity: qty,
    status: 'legacy',
    createdBy: req.user.id,
  });
  await logAction(
    `Production legacy : ${quantity} ${req.body.unit || ''} de ${productType}`,
    'ProductionEntry', entry.id, req,
  );
  return created(res, entry, 'Production enregistrée (mode legacy, sans stock)');
});

exports.validateEntry = asyncHandler(async (req, res) => {
  try {
    const entry = await productionExecution.validateEntry(req.params.id, req);
    return success(res, entry, 'Production validée — stock mis à jour');
  } catch (err) {
    return badRequest(res, err.message || 'Validation impossible');
  }
});

exports.deleteEntry = asyncHandler(async (req, res) => {
  const entry = await db.ProductionEntry.findByPk(req.params.id);
  if (!entry) return notFound(res, 'Entrée introuvable');
  if (entry.status === 'validee') {
    return badRequest(res, 'Impossible de supprimer une production validée (annulation à prévoir)');
  }
  await entry.destroy();
  return success(res, null, 'Entrée supprimée');
});

// ─── Ventes ───────────────────────────────────────────────────────────────────

exports.getAllSales = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.productType) where.productType = req.query.productType;
  const dateFilter = buildDateFilter(req.query.from, req.query.to);
  if (dateFilter) where.saleDate = dateFilter;

  const sales = await db.ProductionSale.findAll({ where, order: [['saleDate', 'DESC']] });
  return success(res, sales);
});

exports.createSale = asyncHandler(async (req, res) => {
  const { recipeId, productType, quantity, unitPrice, saleDate } = req.body;
  if ((!recipeId && !productType) || !quantity || !unitPrice || !saleDate) {
    return badRequest(res, 'Produit, quantité, prix et date sont obligatoires');
  }

  const qty = parseFloat(quantity);
  if (qty <= 0) return badRequest(res, 'La quantité doit être supérieure à 0');

  let resolvedProductType = productType;
  let resolvedProductLabel = req.body.productLabel?.trim() || null;
  let resolvedUnit = req.body.unit || 'unité';
  let finished = null;

  if (recipeId) {
    const recipe = await db.ProductionRecipe.findByPk(recipeId);
    if (!recipe) return notFound(res, 'Recette introuvable');
    resolvedProductType = recipe.productType;
    resolvedProductLabel = recipe.name;
    resolvedUnit = req.body.unit || recipe.outputUnit || 'unité';
    if (recipe.finishedMaterialId) {
      finished = await productionExecution.getFinishedStockByMaterialId(recipe.finishedMaterialId, 0);
    }
  } else {
    finished = await productionExecution.getFinishedStock(productType, 0);
  }

  let stockDispo;

  if (finished) {
    stockDispo = finished.stock;
  } else {
    const [entries, sales] = await Promise.all([
      db.ProductionEntry.findAll({
        where: {
          productType: resolvedProductType,
          status: { [Op.in]: ['legacy', 'validee'] },
          ...(resolvedProductLabel ? { productLabel: resolvedProductLabel } : {}),
        },
      }),
      db.ProductionSale.findAll({
        where: {
          productType: resolvedProductType,
          ...(resolvedProductLabel ? { productLabel: resolvedProductLabel } : {}),
        },
      }),
    ]);
    stockDispo =
      entries.reduce((s, e) => s + parseFloat(e.quantity || 0), 0) -
      sales.reduce((s, v) => s + parseFloat(v.quantity || 0), 0);
  }

  const stockLabel = resolvedProductLabel || resolvedProductType;
  if (qty > stockDispo) {
    return badRequest(res,
      `Stock insuffisant pour "${stockLabel}". ` +
      `Disponible : ${Math.max(0, stockDispo)}, demandé : ${qty}.`,
    );
  }

  const transaction = await db.sequelize.transaction();
  try {
    if (finished && finished.stock >= qty) {
      await stockMovement.createMovement({
        type: 'Sortie',
        materialId: finished.materialId,
        quantity: qty,
        unit: finished.unit || resolvedUnit,
        projectId: 0,
        movementDate: saleDate,
        sourceType: 'production_sale',
        note: `Vente ${stockLabel}`,
        createdBy: req.user.id,
        transaction,
      });
    }

    const sale = await db.ProductionSale.create({
      ...req.body,
      productType: resolvedProductType,
      productLabel: resolvedProductLabel,
      unit: resolvedUnit,
      createdBy: req.user.id,
    }, { transaction });

    await db.Log.create({
      action: `Vente : ${quantity} de ${stockLabel} à ${unitPrice} FCFA`,
      module: 'Production', entityType: 'ProductionSale', entityId: sale.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    }, { transaction });

    await transaction.commit();
    return created(res, sale, 'Vente enregistrée');
  } catch (err) {
    await transaction.rollback();
    return badRequest(res, err.message || 'Erreur vente');
  }
});

exports.deleteSale = asyncHandler(async (req, res) => {
  const sale = await db.ProductionSale.findByPk(req.params.id);
  if (!sale) return notFound(res, 'Vente introuvable');
  await sale.destroy();
  return success(res, null, 'Vente supprimée');
});

// ─── Tableau de bord ──────────────────────────────────────────────────────────

exports.getDashboard = asyncHandler(async (req, res) => {
  const [allEntries, allSales, recipes] = await Promise.all([
    db.ProductionEntry.findAll({
      include: [
        {
          model: db.ProductionRecipe,
          as: 'recipe',
          attributes: ['id', 'name', 'productType', 'outputUnit', 'finishedMaterialId', 'productLabel'],
        },
        { model: db.StockMaterial, as: 'finishedMaterial', attributes: ['id', 'name', 'unit'] },
      ],
    }),
    db.ProductionSale.findAll(),
    db.ProductionRecipe.findAll({
      where: { isActive: true },
      include: [{ model: db.StockMaterial, as: 'finishedMaterial', attributes: ['id', 'name', 'unit'] }],
    }),
  ]);

  const summaryMap = new Map();

  const ensureRow = (key, meta) => {
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        key,
        type: meta.productType || 'Autre',
        label: meta.label || meta.productType || 'Autre',
        unit: meta.unit || 'unité',
        recipeId: meta.recipeId ?? null,
        recipeName: meta.recipeName ?? null,
        finishedMaterialId: meta.finishedMaterialId ?? null,
        produced: 0,
        producedValidated: 0,
        sold: 0,
        stock: 0,
        stockSource: 'virtual',
        revenue: 0,
        totalCost: 0,
        pendingDrafts: 0,
        lastUnitCost: 0,
        lastPrice: 0,
      });
    }
    return summaryMap.get(key);
  };

  for (const recipe of recipes) {
    ensureRow(`recipe-${recipe.id}`, {
      productType: recipe.productType,
      label: recipe.name,
      unit: recipe.outputUnit || recipe.finishedMaterial?.unit || 'unité',
      recipeId: recipe.id,
      recipeName: recipe.name,
      finishedMaterialId: recipe.finishedMaterialId,
    });
  }

  const entryStatus = (entry) => entry.status || 'legacy';

  for (const entry of allEntries) {
    const key = entry.recipeId
      ? `recipe-${entry.recipeId}`
      : entry.finishedMaterialId
        ? `material-${entry.finishedMaterialId}`
        : entry.productLabel?.trim()
          ? `label-${entry.productLabel.trim()}`
          : `type-${entry.productType}`;

    const row = ensureRow(key, {
      productType: entry.productType,
      label: entry.productLabel || entry.recipe?.name || entry.finishedMaterial?.name || entry.productType,
      unit: entry.unit || entry.recipe?.outputUnit || entry.finishedMaterial?.unit || 'unité',
      recipeId: entry.recipeId,
      recipeName: entry.recipe?.name || null,
      finishedMaterialId: entry.finishedMaterialId || entry.recipe?.finishedMaterialId || null,
    });

    const status = entryStatus(entry);
    if (status === 'annulee') continue;

    const qty = parseFloat(entry.quantity || 0);
    row.produced += qty;

    if (status === 'brouillon') {
      row.pendingDrafts += 1;
    } else if (status === 'validee' || status === 'legacy') {
      row.producedValidated += qty;
      if (status === 'validee') {
        row.totalCost += parseFloat(entry.totalCost || 0);
      } else {
        row.totalCost += qty * parseFloat(entry.unitCost || 0);
      }
      const unitCost = parseFloat(entry.unitCost || 0);
      if (unitCost > 0) row.lastUnitCost = unitCost;
    }
  }

  for (const sale of allSales) {
    let key = null;
    const saleLabel = sale.productLabel?.trim();
    if (saleLabel) {
      const recipeMatch = recipes.find((r) => r.name === saleLabel || r.productLabel === saleLabel);
      if (recipeMatch) {
        key = `recipe-${recipeMatch.id}`;
      } else if (summaryMap.has(`label-${saleLabel}`)) {
        key = `label-${saleLabel}`;
      }
    }
    if (!key) key = `type-${sale.productType}`;

    const row = ensureRow(key, {
      productType: sale.productType,
      label: saleLabel || sale.productType,
      unit: sale.unit || 'unité',
    });

    const qty = parseFloat(sale.quantity || 0);
    const price = parseFloat(sale.unitPrice || 0);
    row.sold += qty;
    row.revenue += qty * price;
    row.lastPrice = price;
  }

  for (const row of summaryMap.values()) {
    if (row.finishedMaterialId) {
      const finished = await productionExecution.getFinishedStockByMaterialId(row.finishedMaterialId, 0);
      if (finished) {
        row.stock = Math.max(0, finished.stock);
        row.unit = finished.unit || row.unit;
        row.stockSource = 'material';
      }
    } else {
      row.stock = Math.max(0, row.producedValidated - row.sold);
    }
    row.avgUnitCost = row.producedValidated > 0
      ? row.totalCost / row.producedValidated
      : row.lastUnitCost;
  }

  const summary = [...summaryMap.values()]
    .filter((s) => s.produced > 0 || s.sold > 0 || s.pendingDrafts > 0 || s.stock > 0)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

  const totalRevenue = allSales.reduce(
    (s, v) => s + parseFloat(v.quantity) * parseFloat(v.unitPrice), 0,
  );

  return success(res, {
    summary,
    totalRevenue,
    entriesCount: allEntries.length,
    salesCount: allSales.length,
    recipesCount: recipes.length,
    draftsCount: allEntries.filter((e) => entryStatus(e) === 'brouillon').length,
  });
});
