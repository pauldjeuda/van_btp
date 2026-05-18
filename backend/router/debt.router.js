const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/debt.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',             verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.getAll);
router.post('/:id/repayments', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.addRepayment);
module.exports = router;
