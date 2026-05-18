const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Audit = sequelize.define('Audit', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  auditor: { type: DataTypes.STRING(200) },
  status: {
    type: DataTypes.ENUM('Planifié', 'En cours', 'Terminé'),
    defaultValue: 'Planifié',
  },
  observations: { type: DataTypes.TEXT },
  recommendations: { type: DataTypes.TEXT },
  score: { type: DataTypes.INTEGER, validate: { min: 0, max: 100 } },
  auditDate: { type: DataTypes.DATEONLY, allowNull: false },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  createdBy: { type: DataTypes.INTEGER },
}, { tableName: 'audits', timestamps: true, paranoid: true });

module.exports = Audit;
