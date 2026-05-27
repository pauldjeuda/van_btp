const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/attendance.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/payroll-recap',           verifyToken, verifyRole(['Directeur technique']), ctrl.getPayrollRecap);
router.get('/',                      verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']), ctrl.getAll);
router.post('/mark',                 verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']), ctrl.mark);
router.post('/bulk',                 verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']), ctrl.bulkCreate);
router.get('/employee/:employeeId',  verifyToken, verifyRole(['Directeur technique', 'Chef_chantier']), ctrl.getHistory);
module.exports = router;
