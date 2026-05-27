const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/publicConfig.controller');

router.get('/config', ctrl.getPublicConfig);

module.exports = router;
