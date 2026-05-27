const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/project.controller');
const kpiCtrl    = require('../controllers/projectKpi.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

const { PROJECTS_READ, DG_ONLY } = require('../utils/roles');

router.get('/',     verifyToken, verifyRole(PROJECTS_READ), ctrl.getAll);
router.get('/:id/kpis', verifyToken, verifyRole(PROJECTS_READ), kpiCtrl.getByProject);
router.get('/:id',  verifyToken, verifyRole(PROJECTS_READ), ctrl.getById);
router.post('/',    verifyToken, verifyRole(DG_ONLY), ctrl.create);
router.put('/:id',  verifyToken, verifyRole(DG_ONLY), ctrl.update);
router.delete('/:id', verifyToken, verifyRole(DG_ONLY), ctrl.remove);

module.exports = router;
