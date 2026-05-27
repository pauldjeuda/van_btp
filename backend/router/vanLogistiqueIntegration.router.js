const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/equipmentRequest.controller');

/**
 * Callback VAN Logistique — validation ou rejet.
 * POST /api/integrations/van-logistique/equipment-requests/decide
 *
 * Approuvé (exemple) :
 * { "reference": "BTP-...", "decision": "approved", "status": "approved", ... }
 *
 * Rejeté (exemple) :
 * { "reference": "BTP-...", "decision": "rejected", "status": "rejected", "rejectionReason": "..." }
 */
router.post('/equipment-requests/decide', ctrl.externalDecide);

module.exports = router;
