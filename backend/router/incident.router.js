const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/incident.controller');
const verifyToken  = require('../middlewares/verifyToken');
const verifyRole   = require('../middlewares/verifyRole');
const upload       = require('../services/upload.service');

// Middleware qui fixe le dossier destination avant Multer
const setIncidentFolder = (req, _res, next) => {
  req.uploadFolder = 'incidents';
  next();
};

router.get('/',    verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier']), ctrl.getAll);
router.get('/:id', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier']), ctrl.getById);
router.post('/',   verifyToken, verifyRole(['Chef_chantier', 'Technicien_chantier']),
  setIncidentFolder, upload.single('image'), ctrl.create);
router.put('/:id', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.update);

module.exports = router;
