const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/debt.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');
const { MANAGEMENT } = require('../utils/roles');

router.get('/',             verifyToken, verifyRole(MANAGEMENT), ctrl.getAll);
router.post('/:id/repayments', verifyToken, verifyRole(MANAGEMENT), ctrl.addRepayment);
module.exports = router;
