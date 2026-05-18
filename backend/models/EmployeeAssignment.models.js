// Table pivot : historique des affectations d'un employé à un chantier
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EmployeeAssignment = sequelize.define('EmployeeAssignment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeId: { type: DataTypes.INTEGER, allowNull: false },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  startDate: { type: DataTypes.DATEONLY },
  endDate: { type: DataTypes.DATEONLY },
  note: { type: DataTypes.STRING(255) },
}, { tableName: 'employee_assignments', timestamps: true, paranoid: true });

module.exports = EmployeeAssignment;
