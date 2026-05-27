/**
 * middlewares/verifyRole.js
 * Vérifie que l'utilisateur connecté possède l'un des rôles autorisés.
 * Le Directeur technique a accès à toutes les routes protégées.
 * Tableau vide = réservé au Directeur technique uniquement.
 */
const { forbidden } = require('../utils/response');
const { ROLE_DG } = require('../utils/roles');

const verifyRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.role) {
      return forbidden(res, 'Utilisateur non authentifié');
    }

    if (req.role === ROLE_DG) {
      return next();
    }

    const effective =
      allowedRoles.length === 0 ? [ROLE_DG] : allowedRoles;

    if (!effective.includes(req.role)) {
      return forbidden(
        res,
        `Accès refusé — rôle requis : ${effective.join(' ou ')}`,
      );
    }
    next();
  };
};

module.exports = verifyRole;
