const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductionRecipe = sequelize.define('ProductionRecipe', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  productType: {
    type: DataTypes.ENUM('Parpaing', 'Pavé', 'Bordure', 'Hourdi', 'Autre'),
    allowNull: false,
  },
  productLabel: { type: DataTypes.STRING(200) },
  expectedOutput: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 1 },
  outputUnit: { type: DataTypes.STRING(20), defaultValue: 'unité' },
  estimatedCost: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  finishedMaterialId: { type: DataTypes.INTEGER, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdBy: { type: DataTypes.INTEGER },
}, { tableName: 'production_recipes', timestamps: true, paranoid: true });

module.exports = ProductionRecipe;
