const express = require('express');
const router  = express.Router({ mergeParams: true });
const ctrl    = require('../controllers/projectTask.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');
const { MANAGEMENT } = require('../utils/roles');

router.put('/reorder',           verifyToken, verifyRole(MANAGEMENT), ctrl.reorder);
router.get('/',               verifyToken, verifyRole(MANAGEMENT), ctrl.getAll);
router.post('/',              verifyToken, verifyRole(MANAGEMENT), ctrl.create);
router.put('/:taskId',        verifyToken, verifyRole(MANAGEMENT), ctrl.update);
router.patch('/:taskId/status', verifyToken, verifyRole(MANAGEMENT), ctrl.updateStatus);
router.delete('/:taskId',     verifyToken, verifyRole(MANAGEMENT), ctrl.remove);
module.exports = router;
