const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/production.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole = require('../middlewares/verifyRole');

router.get('/dashboard', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.getDashboard);
router.get('/entries', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.getAllEntries);
router.post('/entries', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.createEntry);
router.delete('/entries/:id', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.deleteEntry);
router.get('/sales', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.getAllSales);
router.post('/sales', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.createSale);
router.delete('/sales/:id', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier']), ctrl.deleteSale);
module.exports = router;
