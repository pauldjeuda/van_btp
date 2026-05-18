const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/document.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');
const upload      = require('../services/upload.service');

const setDocumentFolder = (req, _res, next) => {
  req.uploadFolder = 'documents';
  next();
};

// Middleware qui accepte aussi le token en query param (pour les téléchargements directs)
const verifyTokenOrQuery = (req, res, next) => {
  if (!req.headers['authorization'] && req.query.token) {
    req.headers['authorization'] = `Bearer ${req.query.token}`;
  }
  return verifyToken(req, res, next);
};

router.get('/',
  verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier', 'RH']), ctrl.getAll);

router.post('/',
  verifyToken, verifyRole(['Chef_chantier', 'Technicien_chantier']),
  setDocumentFolder, upload.single('file'), ctrl.upload);

router.get('/:id/download',
  verifyTokenOrQuery, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier', 'RH']), ctrl.download);

router.delete('/:id',
  verifyToken, verifyRole(['Chef_chantier']), ctrl.remove);

module.exports = router;
