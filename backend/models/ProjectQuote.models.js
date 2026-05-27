const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectQuote = sequelize.define('ProjectQuote', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'Devis chantier' },
  status: {
    type: DataTypes.ENUM('En attente', 'Validé', 'Rejeté'),
    defaultValue: 'En attente',
  },
  lines: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '[{ designation, unitPrice, quantity, total }]',
  },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  createdBy: { type: DataTypes.INTEGER },
  createdByRole: { type: DataTypes.STRING(50) },
  reviewedBy: { type: DataTypes.INTEGER },
  rejectionReason: { type: DataTypes.TEXT },
}, { tableName: 'project_quotes', timestamps: true, paranoid: true });

module.exports = ProjectQuote;
