const db = require('../models');
const asyncHandler = require('../middlewares/asyncHandler');
const { success, badRequest } = require('../utils/response');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

const analyzeProject = (project) => {
  const budget = parseFloat(project.budget || 0);
  const ca = parseFloat(project.montantMarche || 0);
  const tx = project.transactions || [];

  const depenses = tx.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const factures = tx.filter(t => t.type === 'invoice').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  
  // Correction : Utilisation du statut 'Payé' (français) au lieu de 'paid'
  const impayes = tx.filter(t => t.type === 'invoice' && t.status !== 'Payé' && t.status !== 'Rejeté');
  
  // Montant réellement encaissé (uniquement factures payées)
  const encaisse = tx.filter(t => t.type === 'invoice' && t.status === 'Payé').reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  const marge = ca - depenses;
  const tauxConsommation = pct(depenses, budget);
  const tauxMarge = pct(encaisse - depenses, encaisse); // Utilise l'encaissement réel au lieu du CA
  
  // Éviter division par zéro ou NaN si progress n'est pas renseigné
  const progress = parseInt(project.progress) || 0;
  const eac = progress > 0 ? Math.round((depenses / progress) * 100) : budget;

  // Sécurisation de budgetItems (doit être un tableau)
  let items = [];
  if (Array.isArray(project.budgetItems)) {
    items = project.budgetItems;
  } else if (typeof project.budgetItems === 'string') {
    try {
      const parsed = JSON.parse(project.budgetItems);
      if (Array.isArray(parsed)) items = parsed;
    } catch (e) {
      items = [];
    }
  }

  const budgetItems = items.map(item => {
    if (!item) return null;
    const category = item.category || item.poste; // Support des deux noms de champs possibles
    const reel = tx.filter(t => t.category === category).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const prevu = parseFloat(item.montantPrevu || 0);
    const ecart = prevu - reel;
    
    return {
      ...item,
      category,
      reel,
      ecart,
      ecartPct: prevu > 0 ? Math.round((ecart / prevu) * 100) : 0,
    };
  }).filter(Boolean);

  return {
    id: project.id, // Pour compatibilité frontend (tri)
    projectId: project.id,
    projectName: project.name,
    name: project.name, // Doublon pour compatibilité
    code: project.code,
    budget,
    ca,
    encaisse, // Montant réellement encaissé (factures payées)
    depenses,
    factures,
    marge,
    tauxConsommation,
    tauxMarge,
    eac,
    budgetItems,
    impayesCount: impayes.length,
    impayesTotal: impayes.reduce((s, t) => s + parseFloat(t.amount || 0), 0),
    ecartBudget: ca - depenses, // Souvent utilisé comme "Marge brute" ou "Reste"
    alert: ca === 0 ? 'neutral' : tauxMarge < 5 ? 'danger' : tauxMarge < 15 ? 'warning' : 'ok',
  };
};

const TX_INCLUDE = [{ model: db.Transaction, as: 'transactions' }];

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.getAllProjectsKPIs = asyncHandler(async (req, res) => {
  const where = {};
  if (req.role === 'Chef_chantier') where.chefId = req.user.id;

  const projects = await db.Project.findAll({ where, include: TX_INCLUDE });
  const kpis = projects.map(analyzeProject);

  return success(res, {
    kpis,
    totals: { // Renommé 'totals' pour correspondre au frontend (kpiData?.totals)
      budget: kpis.reduce((s, k) => s + (k.budget || 0), 0),
      depenses: kpis.reduce((s, k) => s + (k.depenses || 0), 0),
      ca: kpis.reduce((s, k) => s + (k.ca || 0), 0),
      encaisse: kpis.reduce((s, k) => s + (k.encaisse || 0), 0), // Total réellement encaissé
      marge: kpis.reduce((s, k) => s + (k.marge || 0), 0),
      impayesTotal: kpis.reduce((s, k) => s + (k.impayesTotal || 0), 0),
      tauxMargeGlobal: Math.round(kpis.reduce((s, k) => s + (k.tauxMarge || 0), 0) / kpis.length),
    },
  });
});

exports.getProjectAnalysis = asyncHandler(async (req, res) => {
  const project = await db.Project.findByPk(req.params.id, { include: TX_INCLUDE });
  if (!project) return badRequest(res, 'Projet introuvable');
  return success(res, analyzeProject(project));
});

exports.sendReminder = asyncHandler(async (req, res) => {
  const transaction = await db.Transaction.findByPk(req.params.id);
  if (!transaction) return badRequest(res, 'Transaction introuvable');

  transaction.reminderCount = (transaction.reminderCount || 0) + 1;
  await transaction.save();

  await db.Log.create({
    action: `Rappel envoyé pour la transaction ${transaction.reference}`,
    module: 'Finances',
    entityType: 'Transaction',
    entityId: transaction.id,
    userId: req.user.id,
    userRole: req.role,
    userMatricule: req.user.matricule,
  });

  return success(res, { reminderCount: transaction.reminderCount }, 'Rappel enregistré');
});

exports.getAccountingJournal = asyncHandler(async (req, res) => {
  const where = {};
  if (req.role === 'Chef_chantier') {
    const projects = await db.Project.findAll({ where: { chefId: req.user.id }, attributes: ['id'] });
    where.projectId = projects.map(p => p.id);
  }

  // Support des filtres de date et de projet
  if (req.query.projectId) where.projectId = req.query.projectId;
  if (req.query.from || req.query.to) {
    where.journalDate = {};
    if (req.query.from) where.journalDate[db.Sequelize.Op.gte] = req.query.from;
    if (req.query.to) where.journalDate[db.Sequelize.Op.lte] = req.query.to;
  }

  const entries = await db.AccountingEntry.findAll({
    where,
    include: [{ model: db.Project, as: 'project', attributes: ['id', 'name'] }],
    order: [['journalDate', 'DESC']],
  });
  return success(res, entries);
});
