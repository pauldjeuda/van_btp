/**
 * middlewares/upload.js
 * Middleware Multer prêt à l'emploi avec sélection du dossier de destination.
 */
const uploadService = require('../services/upload.service');

// Pour les documents GED
const uploadDocument = (req, _res, next) => {
  req.uploadFolder = 'documents';
  next();
};

// Pour les photos d'incidents
const uploadIncident = (req, _res, next) => {
  req.uploadFolder = 'incidents';
  next();
};

// Pour les avatars utilisateurs
const uploadAvatar = (req, _res, next) => {
  req.uploadFolder = 'avatars';
  next();
};

module.exports = {
  document: [uploadDocument, uploadService.single('file')],
  incident: [uploadIncident, uploadService.single('image')],
  avatar:   [uploadAvatar,   uploadService.single('avatar')],
};
