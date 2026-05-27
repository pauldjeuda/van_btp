/**
 * middlewares/verifyToken.js
 * Vérifie le JWT avec la clé publique RSA du rôle de l'utilisateur.
 * Résout l'ID local par matricule pour assurer la cohérence des clés étrangères.
 */
const { verifyToken: jwtVerify, decodeToken } = require('../services/jwt.service');
const { unauthorized, error } = require('../utils/response');
const db = require('../models');

const ROLE_ALIASES = {
  Directeur_technique: 'Directeur technique',
  Gerant_stock: 'Gestionnaire de stocks',
};

const ROLE_MODELS = {
  'Directeur technique': 'Directeur technique',
  Chef_chantier: 'ChefChantier',
  Gerant_production: 'GerantProduction',
  'Gestionnaire de stocks': 'GerantStock',
};

const ROLE_RSA_DIRS = {
  'directeur technique': 'directeur_technique',
  'directeur_technique': 'directeur_technique',
  'gestionnaire de stocks': 'gerant_stock',
  gerant_stock: 'gerant_stock',
};

const verifyToken = async (req, res, next) => {
  // Extraire le token du header Authorization
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Accès non autorisé — token manquant');
  }

  const token = authHeader.split(' ')[1];

  try {
    // Décoder d'abord sans vérification pour extraire le rôle
    const decoded = decodeToken(token);
    if (!decoded || !decoded.role) {
      return unauthorized(res, 'Token malformé — rôle introuvable');
    }

    const normalizedRole = ROLE_ALIASES[decoded.role] ?? decoded.role;

    // Dossier .private (ancien directeur_technique conservé)
    const roleKey = ROLE_RSA_DIRS[normalizedRole.toLowerCase()] ?? normalizedRole.toLowerCase();

    // Vérifier avec la clé publique du rôle
    const verified = jwtVerify(token, roleKey);

    // ─── RÉSOLUTION / AUTO-PROVISIONING ID LOCAL ─────────────────────────────
    // Indispensable si le token vient d'un système externe (VAN RH)
    const modelName = ROLE_MODELS[normalizedRole];
    if (modelName && db[modelName]) {
      const Model = db[modelName];
      const searchMatricule = String(verified.matricule || '').trim().toLowerCase();
      let localUser = await Model.findOne({ 
        where: db.sequelize.where(
          db.sequelize.fn('LOWER', db.sequelize.col('matricule')),
          searchMatricule
        )
      });
      
      if (!localUser) {
        console.log(`[AUTH] Auto-provisioning de l'utilisateur ${verified.matricule} (${normalizedRole})`);
        // Créer l'utilisateur localement s'il n'existe pas (Confiance accordée au JWT RSA)
        localUser = await Model.create({
          matricule: verified.matricule,
          nom: verified.nom || 'Utilisateur',
          prenom: verified.prenom || 'Externe',
          email: verified.email || `${verified.matricule.toLowerCase()}@vanbtp.net`,
          motDePasse: 'EXTERNAL_AUTH', // Mot de passe fictif (auth déléguée)
          actif: true,
          doitChangerMotDePasse: false,
        });
      }
      // Utiliser l'ID et les infos de la base de données locale pour la suite du traitement
      verified.id = localUser.id;
      verified.nom = verified.nom || localUser.nom;
      verified.prenom = verified.prenom || localUser.prenom;
      verified.matricule = verified.matricule || localUser.matricule;
    }

    req.user = verified;
    req.role = normalizedRole;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Session expirée — veuillez vous reconnecter');
    }
    if (err.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Token invalide');
    }
    console.error('[AUTH] verifyToken error:', err);
    return error(res, 'Erreur de vérification du token', 500, err.message);
  }
};

module.exports = verifyToken;
