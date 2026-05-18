const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/purchase.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',                  verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'RH']), ctrl.getAll);
router.get('/:id',               verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.getById);
router.post('/',                  verifyToken, verifyRole(['Chef_chantier']),        ctrl.create);
router.patch('/:id/status',       verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.updateStatus);
router.delete('/:id',             verifyToken, verifyRole(['Chef_chantier']),        ctrl.remove);

module.exports = router;
