const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboard.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/', verifyToken, verifyRole(['Directeur_technique', 'Chef_chantier', 'Technicien_chantier', 'RH']), ctrl.getKPIs);

module.exports = router;
