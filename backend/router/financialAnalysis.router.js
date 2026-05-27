const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/financialAnalysis.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');
const { MANAGEMENT } = require('../utils/roles');

router.get('/kpis',                      verifyToken, verifyRole(MANAGEMENT), ctrl.getAllProjectsKPIs);
router.get('/projects/:id/analysis',     verifyToken, verifyRole(MANAGEMENT), ctrl.getProjectAnalysis);
router.post('/transactions/:id/remind',  verifyToken, verifyRole(MANAGEMENT), ctrl.sendReminder);
router.get('/accounting',                verifyToken, verifyRole(MANAGEMENT), ctrl.getAccountingJournal);
module.exports = router;
