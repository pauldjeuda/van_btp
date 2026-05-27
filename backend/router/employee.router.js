const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/employee.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',       verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']),  ctrl.getAll);
router.get('/:id',    verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']),  ctrl.getById);
router.post('/',      verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']),         ctrl.create);
router.put('/:id',    verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']),         ctrl.update);
router.delete('/:id',        verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']), ctrl.remove);
router.patch('/:id/unassign',  verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']), ctrl.unassign);

module.exports = router;
