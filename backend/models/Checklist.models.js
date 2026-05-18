const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Checklist = sequelize.define('Checklist', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  category: { type: DataTypes.STRING(100) },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  createdBy: { type: DataTypes.INTEGER },
}, { tableName: 'checklists', timestamps: true, paranoid: true });

module.exports = Checklist;
