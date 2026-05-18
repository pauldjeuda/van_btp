const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/employee.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',       verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'RH', 'Technicien_chantier']),  ctrl.getAll);
router.get('/:id',    verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'RH', 'Technicien_chantier']),  ctrl.getById);
router.post('/',      verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'RH']),         ctrl.create);
router.put('/:id',    verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'RH']),         ctrl.update);
router.delete('/:id',        verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'RH']), ctrl.remove);
router.patch('/:id/unassign',  verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'RH']), ctrl.unassign);

module.exports = router;
