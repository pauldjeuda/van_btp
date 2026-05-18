const express = require('express');
const router  = express.Router();

router.use('/auth',              require('./auth.router'));
router.use('/dashboard',         require('./dashboard.router'));
router.use('/projects',          require('./project.router'));
router.use('/projects/:projectId/amendments', require('./amendment.router'));
router.use('/projects/:projectId/tasks',      require('./projectTask.router'));
router.use('/finance',           require('./financialAnalysis.router'));
router.use('/transactions',      require('./transaction.router'));
router.use('/debts',             require('./debt.router'));
router.use('/employees',         require('./employee.router'));
router.use('/attendance',        require('./attendance.router'));
router.use('/equipment',         require('./equipment.router'));
router.use('/stock',             require('./stock.router'));
router.use('/purchases',         require('./purchase.router'));
router.use('/subcontracts',      require('./subcontract.router'));
router.use('/incidents',         require('./incident.router'));
router.use('/audits',            require('./audit.router'));
router.use('/checklists',        require('./checklist.router'));
router.use('/daily-reports',     require('./dailyReport.router'));
router.use('/documents',         require('./document.router'));
router.use('/tickets',           require('./ticket.router'));
router.use('/production',        require('./production.router'));

module.exports = router;
