/**
 * middlewares/verifyRole.js
 * Vérifie que l'utilisateur connecté possède l'un des rôles autorisés.
 * Usage : verifyRole(['Directeur_technique', 'Chef_chantier'])
 */
const { forbidden } = require('../utils/response');

const verifyRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.role) {
      return forbidden(res, 'Utilisateur non authentifié');
    }
    if (!allowedRoles.includes(req.role)) {
      return forbidden(res, `Accès refusé — rôle requis : ${allowedRoles.join(' ou ')}`);
    }
    next();
  };
};

module.exports = verifyRole;
