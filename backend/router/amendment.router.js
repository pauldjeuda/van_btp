const express = require('express');
const router  = express.Router({ mergeParams: true }); // pour accéder à :projectId
const ctrl    = require('../controllers/amendment.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',           verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.getAll);
router.post('/',          verifyToken, verifyRole(['Chef_chantier']),        ctrl.create);
router.patch('/:id/status', verifyToken, verifyRole(['Directeur_technique']),       ctrl.updateStatus);
module.exports = router;
