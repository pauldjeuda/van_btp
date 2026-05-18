const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Ticket = sequelize.define('Ticket', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  module: { type: DataTypes.STRING(100) },
  priority: {
    type: DataTypes.ENUM('Basse', 'Moyenne', 'Haute', 'Critique'),
    defaultValue: 'Basse',
  },
  status: {
    type: DataTypes.ENUM('Ouvert', 'En cours', 'Résolu', 'Fermé'),
    defaultValue: 'Ouvert',
  },
  description: { type: DataTypes.TEXT },
  resolution: { type: DataTypes.TEXT },
  createdBy: { type: DataTypes.INTEGER },
  createdByRole: { type: DataTypes.STRING(50) },
  assignedTo: { type: DataTypes.INTEGER },
}, { tableName: 'tickets', timestamps: true, paranoid: true });

module.exports = Ticket;
