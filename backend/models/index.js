const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const db = {};

fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.models.js') && f !== 'role.base.models.js')
  .forEach(f => {
    const model = require(path.join(__dirname, f));
    db[model.name] = model;
  });

// ─── ASSOCIATIONS ─────────────────────────────────────────────────────────────

// ChefChantier → Projects
db.ChefChantier.hasMany(db.Project, { foreignKey: 'chefId', as: 'projects' });
db.Project.belongsTo(db.ChefChantier, { foreignKey: 'chefId', as: 'chefChantier' });

// Project → Sous-projets (auto-référence)
db.Project.hasMany(db.Project, { foreignKey: 'parentId', as: 'subprojects' });
db.Project.belongsTo(db.Project, { foreignKey: 'parentId', as: 'parent' });

// Project → Amendments
db.Project.hasMany(db.ProjectAmendment, { foreignKey: 'projectId', as: 'amendments', onDelete: 'CASCADE' });
db.ProjectAmendment.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Project → Tasks
db.Project.hasMany(db.ProjectTask, { foreignKey: 'projectId', as: 'tasks', onDelete: 'CASCADE' });
db.ProjectTask.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });
db.Employee.hasMany(db.ProjectTask, { foreignKey: 'assignedTo', as: 'assignedTasks' });
db.ProjectTask.belongsTo(db.Employee, { foreignKey: 'assignedTo', as: 'assignee' });

// Project → Transactions
db.Project.hasMany(db.Transaction, { foreignKey: 'projectId', as: 'transactions', onDelete: 'CASCADE' });
db.Transaction.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Transaction → AccountingEntries
db.Transaction.hasMany(db.AccountingEntry, { foreignKey: 'transactionId', as: 'accountingEntries', onDelete: 'CASCADE' });
db.AccountingEntry.belongsTo(db.Transaction, { foreignKey: 'transactionId', as: 'transaction' });
db.Project.hasMany(db.AccountingEntry, { foreignKey: 'projectId', as: 'accountingEntries' });
db.AccountingEntry.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Transaction → DebtRepayments
db.Transaction.hasMany(db.DebtRepayment, { foreignKey: 'transactionId', as: 'repayments', onDelete: 'CASCADE' });
db.DebtRepayment.belongsTo(db.Transaction, { foreignKey: 'transactionId', as: 'transaction' });

// Project → Employees
db.Project.hasMany(db.Employee, { foreignKey: 'projectId', as: 'employees' });
db.Employee.belongsTo(db.Project, { foreignKey: 'projectId', as: 'currentProject' });

// Employee → Assignments
db.Employee.hasMany(db.EmployeeAssignment, { foreignKey: 'employeeId', as: 'assignments', onDelete: 'CASCADE' });
db.EmployeeAssignment.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Project.hasMany(db.EmployeeAssignment, { foreignKey: 'projectId', as: 'assignments' });
db.EmployeeAssignment.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Employee → Attendances
db.Employee.hasMany(db.Attendance, { foreignKey: 'employeeId', as: 'attendances', onDelete: 'CASCADE' });
db.Attendance.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Project.hasMany(db.Attendance, { foreignKey: 'projectId', as: 'attendances', onDelete: 'CASCADE' });
db.Attendance.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Project → Equipment
db.Project.hasMany(db.Equipment, { foreignKey: 'projectId', as: 'equipment' });
db.Equipment.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Project → StockMovements
db.Project.hasMany(db.StockMovement, { foreignKey: 'projectId', as: 'stockMovements', onDelete: 'CASCADE' });
db.StockMovement.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Project → Purchases
db.Project.hasMany(db.Purchase, { foreignKey: 'projectId', as: 'purchases', onDelete: 'CASCADE' });
db.Purchase.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Project → Subcontracts
db.Project.hasMany(db.Subcontract, { foreignKey: 'projectId', as: 'subcontracts', onDelete: 'CASCADE' });
db.Subcontract.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });
db.Subcontract.hasMany(db.SubcontractTask, { foreignKey: 'subcontractId', as: 'tasks', onDelete: 'CASCADE' });
db.SubcontractTask.belongsTo(db.Subcontract, { foreignKey: 'subcontractId', as: 'subcontract' });

// Project → Incidents
db.Project.hasMany(db.Incident, { foreignKey: 'projectId', as: 'incidents', onDelete: 'CASCADE' });
db.Incident.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });
db.Incident.hasMany(db.IncidentHistory, { foreignKey: 'incidentId', as: 'history', onDelete: 'CASCADE' });
db.IncidentHistory.belongsTo(db.Incident, { foreignKey: 'incidentId', as: 'incident' });

// Project → Audits
db.Project.hasMany(db.Audit, { foreignKey: 'projectId', as: 'audits', onDelete: 'CASCADE' });
db.Audit.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Project → Checklists
db.Project.hasMany(db.Checklist, { foreignKey: 'projectId', as: 'checklists', onDelete: 'CASCADE' });
db.Checklist.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });
db.Checklist.hasMany(db.ChecklistTask, { foreignKey: 'checklistId', as: 'tasks', onDelete: 'CASCADE' });
db.ChecklistTask.belongsTo(db.Checklist, { foreignKey: 'checklistId', as: 'checklist' });

// Project → DailyReports
db.Project.hasMany(db.DailyReport, { foreignKey: 'projectId', as: 'dailyReports', onDelete: 'CASCADE' });
db.DailyReport.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

// Project → Documents
db.Project.hasMany(db.Document, { foreignKey: 'projectId', as: 'documents' });
db.Document.belongsTo(db.Project, { foreignKey: 'projectId', as: 'project' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
