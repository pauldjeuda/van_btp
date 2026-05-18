const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChecklistTask = sequelize.define('ChecklistTask', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  completedAt: { type: DataTypes.DATE },
  completedBy: { type: DataTypes.INTEGER },
  checklistId: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'checklist_tasks', timestamps: true, paranoid: true });

module.exports = ChecklistTask;
