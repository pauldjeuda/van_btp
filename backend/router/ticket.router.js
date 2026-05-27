const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/ticket.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',       verifyToken, verifyRole(['Chef_chantier']), ctrl.getAll);
router.post('/',       verifyToken, verifyRole(['Chef_chantier']), ctrl.create);
router.put('/:id',     verifyToken, verifyRole([]),                              ctrl.update);
router.delete('/:id',  verifyToken, verifyRole([]),                              ctrl.remove);

module.exports = router;
