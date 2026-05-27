const express = require('express');
const router  = express.Router({ mergeParams: true }); // pour accéder à :projectId
const ctrl    = require('../controllers/amendment.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');
const { MANAGEMENT } = require('../utils/roles');

router.get('/',           verifyToken, verifyRole(MANAGEMENT), ctrl.getAll);
router.post('/',          verifyToken, verifyRole(MANAGEMENT), ctrl.create);
router.patch('/:id/status', verifyToken, verifyRole([]), ctrl.updateStatus);
module.exports = router;
