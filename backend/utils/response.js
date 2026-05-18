/**
 * utils/response.js
 * Helpers pour des réponses HTTP standardisées dans tous les controllers.
 */

const success = (res, data, message = 'Succès', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const created = (res, data, message = 'Ressource créée avec succès') => {
  return success(res, data, message, 201);
};

const error = (res, message = 'Une erreur est survenue', statusCode = 500, details = null) => {
  const body = { success: false, message };
  if (details && process.env.NODE_ENV === 'development') body.details = details;
  return res.status(statusCode).json(body);
};

const notFound = (res, message = 'Ressource introuvable') => {
  return error(res, message, 404);
};

const unauthorized = (res, message = 'Non autorisé') => {
  return error(res, message, 401);
};

const forbidden = (res, message = 'Accès refusé') => {
  return error(res, message, 403);
};

const badRequest = (res, message = 'Données invalides', details = null) => {
  return error(res, message, 400, details);
};

module.exports = { success, created, error, notFound, unauthorized, forbidden, badRequest };
