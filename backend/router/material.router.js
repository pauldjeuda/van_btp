const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/material.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole = require('../middlewares/verifyRole');
const { ROLE_STOCK, ROLE_DG, ROLE_CHEF } = require('../utils/roles');

const READ_ROLES = [ROLE_STOCK, ROLE_DG, ROLE_CHEF];
const WRITE_ROLES = [ROLE_STOCK, ROLE_DG, ROLE_CHEF];

router.get('/inventory', verifyToken, verifyRole(READ_ROLES), ctrl.getInventory);
router.post('/', verifyToken, verifyRole(WRITE_ROLES), ctrl.create);
router.put('/:id', verifyToken, verifyRole(WRITE_ROLES), ctrl.update);
router.delete('/:id', verifyToken, verifyRole([ROLE_STOCK, ROLE_DG]), ctrl.remove);

module.exports = router;
