const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/approvals.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole = require('../middlewares/verifyRole');

router.get('/pending', verifyToken, verifyRole([]), ctrl.getPending);
router.post('/:type/:id/decide', verifyToken, verifyRole([]), ctrl.decide);

module.exports = router;
