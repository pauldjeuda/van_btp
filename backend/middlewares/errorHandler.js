/**
 * middlewares/errorHandler.js
 * Gestionnaire d'erreurs global Express — à placer en dernier dans server.js.
 */
const { error } = require('../utils/response');

const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Erreur Sequelize : validation
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message);
    return error(res, 'Données invalides', 400, messages);
  }

  // Erreur Sequelize : unicité
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'champ';
    return error(res, `La valeur du champ "${field}" existe déjà`, 409);
  }

  // Erreur Sequelize : clé étrangère
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return error(res, 'Référence invalide — ressource liée introuvable', 400);
  }

  // Erreur Multer : fichier trop grand
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, `Fichier trop volumineux (max ${process.env.MAX_FILE_SIZE_MB || 10} MB)`, 413);
  }

  // Erreur Multer : type non autorisé
  if (err.message && err.message.includes('Type de fichier non autorisé')) {
    return error(res, err.message, 415);
  }

  // Erreur générique
  return error(res, err.message || 'Erreur interne du serveur', err.status || 500);
};

module.exports = errorHandler;
