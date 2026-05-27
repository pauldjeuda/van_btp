const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SubcontractTask = sequelize.define('SubcontractTask', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:        { type: DataTypes.STRING(255), allowNull: false },
  completed:    { type: DataTypes.BOOLEAN, defaultValue: false },
  paid:         { type: DataTypes.BOOLEAN, defaultValue: false },
  // Gestion par lots
  lotNumber:    { type: DataTypes.INTEGER, defaultValue: 1 },
  lotName:      { type: DataTypes.STRING(200), defaultValue: 'Lot 1' },
  cost:         { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  subcontractId:{ type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'subcontract_tasks', timestamps: true, paranoid: true });

module.exports = SubcontractTask;
