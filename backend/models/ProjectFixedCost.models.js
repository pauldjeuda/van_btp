const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectFixedCost = sequelize.define('ProjectFixedCost', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  type: {
    type: DataTypes.ENUM('ENEO', 'Carburant', 'Eau', 'Maintenance', 'Autre'),
    allowNull: false,
    defaultValue: 'Autre',
  },
  label: { type: DataTypes.STRING(200), allowNull: true },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  period: {
    type: DataTypes.ENUM('Journalier', 'Hebdomadaire', 'Mensuel', 'Ponctuel'),
    allowNull: false,
    defaultValue: 'Mensuel',
  },
  notes: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.INTEGER },
}, { tableName: 'project_fixed_costs', timestamps: true, paranoid: true });

module.exports = ProjectFixedCost;
