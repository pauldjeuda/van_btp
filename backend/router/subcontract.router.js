const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/subcontract.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

const { MANAGEMENT, DG_ONLY } = require('../utils/roles');

router.get('/',                          verifyToken, verifyRole(MANAGEMENT), ctrl.getAll);
router.post('/',                          verifyToken, verifyRole(DG_ONLY), ctrl.create);
router.put('/:id',                        verifyToken, verifyRole(DG_ONLY), ctrl.update);
router.delete('/:id',                     verifyToken, verifyRole(DG_ONLY), ctrl.remove);
router.post('/:id/pay-completed-tasks', verifyToken, verifyRole(MANAGEMENT), ctrl.payCompletedTasks);
router.patch('/:id/tasks/:taskId/toggle', verifyToken, verifyRole(MANAGEMENT), ctrl.toggleTask);

module.exports = router;
