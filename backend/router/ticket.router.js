const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/ticket.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',       verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier', 'RH']), ctrl.getAll);
router.post('/',       verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier', 'RH']), ctrl.create);
router.put('/:id',     verifyToken, verifyRole(['Directeur_technique']),                              ctrl.update);
router.delete('/:id',  verifyToken, verifyRole(['Directeur_technique']),                              ctrl.remove);

module.exports = router;
