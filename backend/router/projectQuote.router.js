const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/projectQuote.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole = require('../middlewares/verifyRole');
const { MANAGEMENT } = require('../utils/roles');

router.get('/', verifyToken, verifyRole(MANAGEMENT), ctrl.getAll);
router.get('/:quoteId', verifyToken, verifyRole(MANAGEMENT), ctrl.getOne);
router.post('/', verifyToken, verifyRole(MANAGEMENT), ctrl.create);
router.put('/:quoteId', verifyToken, verifyRole(MANAGEMENT), ctrl.update);
router.patch('/:quoteId/approve', verifyToken, verifyRole(MANAGEMENT), ctrl.approve);
router.patch('/:quoteId/reject', verifyToken, verifyRole(MANAGEMENT), ctrl.reject);
router.delete('/:quoteId', verifyToken, verifyRole(MANAGEMENT), ctrl.remove);

module.exports = router;
