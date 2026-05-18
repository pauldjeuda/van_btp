const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProjectTask = sequelize.define('ProjectTask', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:       { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  projectId:   { type: DataTypes.INTEGER, allowNull: false },
  assignedTo:  { type: DataTypes.INTEGER, allowNull: true },   // FK Employee.id
  assignedRole:{ type: DataTypes.STRING(100) },                // ingénieur / consultant / technicien
  status: {
    type: DataTypes.ENUM('À faire', 'En cours', 'Terminé', 'Bloqué'),
    defaultValue: 'À faire',
  },
  priority: {
    type: DataTypes.ENUM('Basse', 'Normale', 'Haute', 'Critique'),
    defaultValue: 'Normale',
  },
  progress:  { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 100 } },
  startDate: { type: DataTypes.DATEONLY },
  dueDate:   { type: DataTypes.DATEONLY },
  createdBy: { type: DataTypes.INTEGER },
}, { tableName: 'project_tasks', timestamps: true, paranoid: true });

module.exports = ProjectTask;
