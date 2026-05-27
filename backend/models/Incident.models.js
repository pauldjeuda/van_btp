const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Incident = sequelize.define('Incident', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  type: { type: DataTypes.STRING(100) },
  category: { type: DataTypes.ENUM('hse', 'quality'), allowNull: false },
  gravity: {
    type: DataTypes.ENUM('Mineur', 'Modéré', 'Grave', 'Critique'),
    defaultValue: 'Mineur',
  },
  description: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM('Ouvert', 'En cours de traitement', 'Résolu', 'Fermé'),
    defaultValue: 'Ouvert',
  },
  actionPlan: { type: DataTypes.TEXT },
  impact: { type: DataTypes.TEXT },
  imageUrl: { type: DataTypes.STRING(255) },
  images: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  incidentDate: { type: DataTypes.DATEONLY, allowNull: false },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  reporterId: { type: DataTypes.INTEGER },
}, { tableName: 'incidents', timestamps: true, paranoid: true });

module.exports = Incident;
