const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/stock.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');
const { ROLE_STOCK, ROLE_DG, ROLE_CHEF } = require('../utils/roles');

router.get('/',       verifyToken, verifyRole([ROLE_STOCK, ROLE_DG, ROLE_CHEF]), ctrl.getAll);
router.post('/',      verifyToken, verifyRole([ROLE_STOCK, ROLE_DG, ROLE_CHEF]), ctrl.create);
router.delete('/:id', verifyToken, verifyRole([ROLE_STOCK]), ctrl.remove);

module.exports = router;
