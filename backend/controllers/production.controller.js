const { Op } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, created, notFound, badRequest } = require('../utils/response');

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Productions ──────────────────────────────────────────────────────────────

exports.getAllEntries = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.productType) where.productType = req.query.productType;
  const dateFilter = buildDateFilter(req.query.from, req.query.to);
  if (dateFilter) where.productionDate = dateFilter;

  const entries = await db.ProductionEntry.findAll({ where, order: [['productionDate', 'DESC']] });
  return success(res, entries);
});

exports.createEntry = asyncHandler(async (req, res) => {
  const { productType, quantity, productionDate } = req.body;
  if (!productType || !quantity || !productionDate) {
    return badRequest(res, 'Type, quantité et date sont obligatoires');
  }
  const entry = await db.ProductionEntry.create({ ...req.body, createdBy: req.user.id });
  await logAction(
    `Production : ${quantity} ${req.body.unit || ''} de ${productType}`,
    'ProductionEntry', entry.id, req
  );
  return created(res, entry, 'Production enregistrée');
});

exports.deleteEntry = asyncHandler(async (req, res) => {
  const entry = await db.ProductionEntry.findByPk(req.params.id);
  if (!entry) return notFound(res, 'Entrée introuvable');
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
  const { productType, quantity, unitPrice, saleDate } = req.body;
  if (!productType || !quantity || !unitPrice || !saleDate) {
    return badRequest(res, 'Type, quantité, prix et date sont obligatoires');
  }

  const qty = parseFloat(quantity);
  if (qty <= 0) return badRequest(res, 'La quantité doit être supérieure à 0');

  const [entries, sales] = await Promise.all([
    db.ProductionEntry.findAll({ where: { productType } }),
    db.ProductionSale.findAll({ where: { productType } }),
  ]);
  const stockDispo =
    entries.reduce((s, e) => s + parseFloat(e.quantity || 0), 0) -
    sales.reduce((s, v) => s + parseFloat(v.quantity || 0), 0);

  if (qty > stockDispo) {
    return badRequest(res,
      `Stock insuffisant pour "${productType}". ` +
      `Disponible : ${Math.max(0, stockDispo)} unités, demandé : ${qty} unités.`
    );
  }

  const sale = await db.ProductionSale.create({ ...req.body, createdBy: req.user.id });
  await logAction(
    `Vente : ${quantity} ${req.body.unit || ''} de ${productType} à ${unitPrice} FCFA/unité`,
    'ProductionSale', sale.id, req
  );
  return created(res, sale, 'Vente enregistrée');
});

exports.deleteSale = asyncHandler(async (req, res) => {
  const sale = await db.ProductionSale.findByPk(req.params.id);
  if (!sale) return notFound(res, 'Vente introuvable');
  await sale.destroy();
  return success(res, null, 'Vente supprimée');
});

// ─── Tableau de bord ──────────────────────────────────────────────────────────

exports.getDashboard = asyncHandler(async (req, res) => {
  const [allEntries, allSales] = await Promise.all([
    db.ProductionEntry.findAll(),
    db.ProductionSale.findAll(),
  ]);

  const summary = PRODUCT_TYPES
    .map(type => {
      const typeEntries = allEntries.filter(e => e.productType === type);
      const typeSales = allSales
        .filter(s => s.productType === type)
        .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

      const produced = typeEntries.reduce((s, e) => s + parseFloat(e.quantity), 0);
      const sold = typeSales.reduce((s, v) => s + parseFloat(v.quantity), 0);
      const revenue = typeSales.reduce((s, v) => s + parseFloat(v.quantity) * parseFloat(v.unitPrice), 0);
      const totalCost = typeEntries.reduce((s, e) => s + parseFloat(e.quantity) * parseFloat(e.unitCost || 0), 0);

      const sortedEntries = typeEntries.sort((a, b) => new Date(b.productionDate) - new Date(a.productionDate));

      return {
        type,
        produced,
        sold,
        stock: Math.max(0, produced - sold),
        revenue,
        lastPrice: typeSales[0] ? parseFloat(typeSales[0].unitPrice) : 0,
        lastUnitCost: sortedEntries[0] ? parseFloat(sortedEntries[0].unitCost || 0) : 0,
        avgUnitCost: produced > 0 ? totalCost / produced : 0,
      };
    })
    .filter(s => s.produced > 0 || s.sold > 0);

  const totalRevenue = allSales.reduce(
    (s, v) => s + parseFloat(v.quantity) * parseFloat(v.unitPrice), 0
  );

  return success(res, {
    summary,
    totalRevenue,
    entriesCount: allEntries.length,
    salesCount: allSales.length,
  });
});
