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

const DOC_ROLES = ['Directeur technique', 'Chef_chantier'];

router.get('/', verifyToken, verifyRole(DOC_ROLES), ctrl.getAll);

router.post('/',
  verifyToken, verifyRole(DOC_ROLES),
  setDocumentFolder, upload.single('file'), ctrl.upload);

router.get('/:id/download',
  verifyTokenOrQuery, verifyRole(DOC_ROLES), ctrl.download);

router.delete('/:id',
  verifyToken, verifyRole(DOC_ROLES), ctrl.remove);

module.exports = router;
