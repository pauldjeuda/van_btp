const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/attendance.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',                      verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'RH', 'Technicien_chantier']), ctrl.getAll);
router.post('/bulk',                 verifyToken, verifyRole(['Technicien_chantier']),             ctrl.bulkCreate);
router.get('/employee/:employeeId',  verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'RH', 'Technicien_chantier']), ctrl.getHistory);
module.exports = router;
