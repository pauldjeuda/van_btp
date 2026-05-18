const express     = require('express');
const router      = express.Router();
const ctrl        = require('../controllers/auth.controller');
const verifyToken = require('../middlewares/verifyToken');

router.post('/login',    ctrl.login);       // POST /api/auth/login
router.post('/refresh',  ctrl.refresh);     // POST /api/auth/refresh  (cookie httpOnly)
router.post('/logout',   ctrl.logout);      // POST /api/auth/logout
router.get ('/me',   verifyToken, ctrl.getMe);           // GET  /api/auth/me
router.put ('/password', verifyToken, ctrl.changePassword); // PUT /api/auth/password

module.exports = router;
