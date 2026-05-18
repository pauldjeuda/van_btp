const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectAmendment = sequelize.define('ProjectAmendment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('Délai', 'Budget', 'Périmètre', 'Autre'),
    allowNull: false,
  },
  justification: { type: DataTypes.TEXT, allowNull: false },
  // Délai
  ancienneDate:  { type: DataTypes.DATEONLY },
  nouvelleDate:  { type: DataTypes.DATEONLY },
  // Budget
  ancienBudget:  { type: DataTypes.DECIMAL(15, 2) },
  nouveauBudget: { type: DataTypes.DECIMAL(15, 2) },
  // Statut
  statut: {
    type: DataTypes.ENUM('En attente', 'Approuvé', 'Rejeté'),
    defaultValue: 'En attente',
  },
  approvedBy: { type: DataTypes.INTEGER },
  createdBy:  { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'project_amendments', timestamps: true, paranoid: true });

module.exports = ProjectAmendment;
