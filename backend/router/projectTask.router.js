const express = require('express');
const router  = express.Router({ mergeParams: true });
const ctrl    = require('../controllers/projectTask.controller');
const verifyToken = require('../middlewares/verifyToken');
const verifyRole  = require('../middlewares/verifyRole');

router.get('/',               verifyToken, verifyRole(['Directeur_technique','Chef_chantier','Technicien_chantier']), ctrl.getAll);
router.post('/',              verifyToken, verifyRole(['Chef_chantier']),                   ctrl.create);
router.put('/:taskId',        verifyToken, verifyRole(['Directeur_technique','Chef_chantier']),              ctrl.update);
router.patch('/:taskId/status', verifyToken, verifyRole(['Directeur_technique','Chef_chantier','Technicien_chantier']), ctrl.updateStatus);
router.delete('/:taskId',     verifyToken, verifyRole(['Chef_chantier']),                   ctrl.remove);
module.exports = router;
