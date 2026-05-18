const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Log = sequelize.define('Log', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  action: { type: DataTypes.STRING(255), allowNull: false },
  module: { type: DataTypes.STRING(100) },
  entityType: { type: DataTypes.STRING(100) },
  entityId: { type: DataTypes.INTEGER },
  details: { type: DataTypes.JSON },
  userId: { type: DataTypes.INTEGER },
  userRole: { type: DataTypes.STRING(50) },
  userMatricule: { type: DataTypes.STRING(20) },
  ip: { type: DataTypes.STRING(45) },
}, { tableName: 'logs', timestamps: true, updatedAt: false, paranoid: true });

module.exports = Log;
