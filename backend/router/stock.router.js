const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/stock.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',       verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier', 'RH']), ctrl.getAll);
router.post('/',      verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier']),  ctrl.create);
router.delete('/:id', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']),                         ctrl.remove);

module.exports = router;
