const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const IncidentHistory = sequelize.define('IncidentHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  action: { type: DataTypes.STRING(255), allowNull: false },
  note: { type: DataTypes.TEXT },
  incidentId: { type: DataTypes.INTEGER, allowNull: false },
  userId: { type: DataTypes.INTEGER },
  userRole: { type: DataTypes.STRING(50) },
}, { tableName: 'incident_history', timestamps: true, paranoid: true });

module.exports = IncidentHistory;
