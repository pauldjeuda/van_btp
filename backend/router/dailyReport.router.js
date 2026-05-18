const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dailyReport.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',     verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier']), ctrl.getAll);
router.post('/',     verifyToken, verifyRole(['Chef_chantier', 'Technicien_chantier']),        ctrl.create);
router.put('/:id',   verifyToken, verifyRole(['Chef_chantier', 'Technicien_chantier']),        ctrl.update);

module.exports = router;
