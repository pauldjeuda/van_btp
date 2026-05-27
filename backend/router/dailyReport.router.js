const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dailyReport.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');
const { MANAGEMENT } = require('../utils/roles');

router.get('/',     verifyToken, verifyRole(MANAGEMENT), ctrl.getAll);
router.post('/',    verifyToken, verifyRole(MANAGEMENT), ctrl.create);
router.put('/:id',  verifyToken, verifyRole(MANAGEMENT), ctrl.update);

module.exports = router;
