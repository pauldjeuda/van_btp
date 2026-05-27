const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/equipmentRequest.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole = require('../middlewares/verifyRole');
const { MANAGEMENT } = require('../utils/roles');

router.get(
  '/',
  verifyToken,
  verifyRole(['Directeur technique', 'Chef_chantier']),
  ctrl.getAll,
);
router.get(
  '/:id',
  verifyToken,
  verifyRole(['Directeur technique', 'Chef_chantier']),
  ctrl.getById,
);
router.post(
  '/',
  verifyToken,
  verifyRole(MANAGEMENT),
  ctrl.create,
);
router.patch(
  '/:id/cancel',
  verifyToken,
  verifyRole(['Directeur technique', 'Chef_chantier']),
  ctrl.cancel,
);
router.post(
  '/:id/retry',
  verifyToken,
  verifyRole(['Directeur technique', 'Chef_chantier']),
  ctrl.retry,
);

module.exports = router;
