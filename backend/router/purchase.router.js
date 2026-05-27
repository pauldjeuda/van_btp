const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/purchase.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');
const { MANAGEMENT } = require('../utils/roles');

router.get('/',                  verifyToken, verifyRole(MANAGEMENT), ctrl.getAll);
router.get('/:id',               verifyToken, verifyRole(MANAGEMENT), ctrl.getById);
router.post('/batch',             verifyToken, verifyRole(MANAGEMENT), ctrl.createBatch);
router.post('/',                  verifyToken, verifyRole(MANAGEMENT), ctrl.create);
router.patch('/:id/status',       verifyToken, verifyRole(MANAGEMENT), ctrl.updateStatus);
router.delete('/:id',             verifyToken, verifyRole(MANAGEMENT), ctrl.remove);

module.exports = router;
