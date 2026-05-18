const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Project = sequelize.define('Project', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(20), unique: true, allowNull: false },
  name:   { type: DataTypes.STRING(200), allowNull: false },
  client:  { type: DataTypes.STRING(200), allowNull: false },
  manager: { type: DataTypes.STRING(200), allowNull: true },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'préparation',
  },
  category: {
    type: DataTypes.STRING(100),
    defaultValue: 'Autre',
  },
  subCategory: {
    type: DataTypes.ENUM('Gros œuvre','Second œuvre'),
    allowNull: true,
  },
  budget:   { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  // Montant du marché signé (référence contractuelle)
  montantMarche: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  // Budget ventilé par poste (template DAF)
  budgetItems: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: '[{ poste: "Main d\'oeuvre", montantPrevu: 5000000 }, ...]',
  },
  progress: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 100 } },
  location: { type: DataTypes.STRING(255) },
  region:   { type: DataTypes.STRING(100) },
  startDate: { type: DataTypes.DATEONLY },
  endDate:   { type: DataTypes.DATEONLY },
  amendmentCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  chefId:    { type: DataTypes.INTEGER, allowNull: true },
  // Hiérarchie : sous-projet
  parentId:  { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'projects', timestamps: true, paranoid: true });

module.exports = Project;
