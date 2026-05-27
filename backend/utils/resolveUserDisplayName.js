const db = require('../models');
const { serializeIncidentForApi } = require('./incidentHelpers');

const ROLE_MODELS = {
  'Directeur technique': db['Directeur technique'],
  Chef_chantier: db.ChefChantier,
  Gerant_production: db.GerantProduction,
  'Gestionnaire de stocks': db.GerantStock,
};

const ROLE_ALIASES = {
  Gerant_stock: 'Gestionnaire de stocks',
};

const formatName = (user) => {
  if (!user) return '';
  const full = `${user.prenom || ''} ${user.nom || ''}`.trim();
  return full || user.matricule || '';
};

/**
 * Résout le nom affichable d'un utilisateur (id + rôle optionnel).
 */
async function resolveUserDisplayName(userId, userRole) {
  if (!userId) return '';

  const effectiveRole = ROLE_ALIASES[userRole] ?? userRole;
  if (effectiveRole && ROLE_MODELS[effectiveRole]) {
    const user = await ROLE_MODELS[effectiveRole].findByPk(userId, {
      attributes: ['nom', 'prenom', 'matricule'],
    });
    const name = formatName(user);
    if (name) return name;
  }

  for (const Model of Object.values(ROLE_MODELS)) {
    const user = await Model.findByPk(userId, {
      attributes: ['nom', 'prenom', 'matricule'],
    });
    const name = formatName(user);
    if (name) return name;
  }

  return '';
}

function displayNameFromTokenUser(user) {
  if (!user) return '';
  const full = `${user.prenom || ''} ${user.nom || ''}`.trim();
  return full || user.matricule || user.email || '';
}

/**
 * Ajoute le champ `reporter` (déclarant) à un incident sérialisé.
 */
async function enrichIncidentWithReporter(incident) {
  const plain = incident?.toJSON ? incident.toJSON() : { ...incident };
  const history = plain.history || [];
  const declaration =
    history.find((h) => String(h.action || '').includes('Déclaration')) || history[0];
  const role = declaration?.userRole || null;
  const reporter = await resolveUserDisplayName(plain.reporterId, role);
  return serializeIncidentForApi({ ...plain, reporter });
}

async function enrichIncidentsWithReporter(incidents) {
  const cache = new Map();
  const enriched = [];

  for (const incident of incidents) {
    const plain = incident?.toJSON ? incident.toJSON() : { ...incident };
    const history = plain.history || [];
    const declaration =
      history.find((h) => String(h.action || '').includes('Déclaration')) || history[0];
    const role = declaration?.userRole || '';
    const cacheKey = `${plain.reporterId || ''}:${role}`;

    if (!cache.has(cacheKey)) {
      cache.set(cacheKey, await resolveUserDisplayName(plain.reporterId, role || null));
    }

    enriched.push(
      serializeIncidentForApi({ ...plain, reporter: cache.get(cacheKey) || '' }),
    );
  }

  return enriched;
}

module.exports = {
  resolveUserDisplayName,
  displayNameFromTokenUser,
  enrichIncidentWithReporter,
  enrichIncidentsWithReporter,
};
