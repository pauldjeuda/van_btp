const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductionRecipeLine = sequelize.define('ProductionRecipeLine', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recipeId: { type: DataTypes.INTEGER, allowNull: false },
  materialId: { type: DataTypes.INTEGER, allowNull: false },
  quantityPerBatch: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
  unit: { type: DataTypes.STRING(30) },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'production_recipe_lines', timestamps: true });

module.exports = ProductionRecipeLine;
