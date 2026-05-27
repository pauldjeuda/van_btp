const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/projectFixedCost.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole = require('../middlewares/verifyRole');
const { MANAGEMENT } = require('../utils/roles');

router.get('/', verifyToken, verifyRole(MANAGEMENT), ctrl.getAll);
router.get('/summary', verifyToken, verifyRole(MANAGEMENT), ctrl.getCostSummary);
router.post('/', verifyToken, verifyRole(MANAGEMENT), ctrl.create);
router.put('/:costId', verifyToken, verifyRole(MANAGEMENT), ctrl.update);
router.delete('/:costId', verifyToken, verifyRole(MANAGEMENT), ctrl.remove);

module.exports = router;
