const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/financialAnalysis.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/kpis',                      verifyToken, verifyRole(['Directeur_technique','Chef_chantier']), ctrl.getAllProjectsKPIs);
router.get('/projects/:id/analysis',     verifyToken, verifyRole(['Directeur_technique','Chef_chantier']), ctrl.getProjectAnalysis);
router.post('/transactions/:id/remind',  verifyToken, verifyRole(['Directeur_technique','Chef_chantier']), ctrl.sendReminder);
router.get('/accounting',                verifyToken, verifyRole(['Directeur_technique','Chef_chantier']), ctrl.getAccountingJournal);
module.exports = router;
