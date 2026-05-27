const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/production.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole = require('../middlewares/verifyRole');
const { ROLE_PROD } = require('../utils/roles');

const PROD = [ROLE_PROD];

router.get('/dashboard', verifyToken, verifyRole(PROD), ctrl.getDashboard);
router.get('/materials', verifyToken, verifyRole(PROD), ctrl.getMaterials);

router.get('/recipes', verifyToken, verifyRole(PROD), ctrl.getRecipes);
router.get('/recipes/:id', verifyToken, verifyRole(PROD), ctrl.getRecipeById);
router.post('/recipes', verifyToken, verifyRole(PROD), ctrl.createRecipe);
router.put('/recipes/:id', verifyToken, verifyRole(PROD), ctrl.updateRecipe);
router.delete('/recipes/:id', verifyToken, verifyRole(PROD), ctrl.deleteRecipe);
router.post('/recipes/:id/preview', verifyToken, verifyRole(PROD), ctrl.previewRecipe);

router.get('/entries', verifyToken, verifyRole(PROD), ctrl.getAllEntries);
router.post('/entries', verifyToken, verifyRole(PROD), ctrl.createEntry);
router.post('/entries/:id/validate', verifyToken, verifyRole(PROD), ctrl.validateEntry);
router.delete('/entries/:id', verifyToken, verifyRole(PROD), ctrl.deleteEntry);

router.get('/sales', verifyToken, verifyRole(PROD), ctrl.getAllSales);
router.post('/sales', verifyToken, verifyRole(PROD), ctrl.createSale);
router.delete('/sales/:id', verifyToken, verifyRole(PROD), ctrl.deleteSale);

module.exports = router;
