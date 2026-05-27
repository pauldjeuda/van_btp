const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductionEntry = sequelize.define('ProductionEntry', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productType: {
    type: DataTypes.ENUM('Parpaing', 'Pavé', 'Bordure', 'Hourdi', 'Autre'),
    allowNull: false,
  },
  productLabel:   { type: DataTypes.STRING(200) },
  quantity:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit:           { type: DataTypes.STRING(20), defaultValue: 'unité' },
  unitCost:       { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  productionDate: { type: DataTypes.DATEONLY, allowNull: false },
  note:           { type: DataTypes.TEXT },
  createdBy:      { type: DataTypes.INTEGER },
  recipeId:       { type: DataTypes.INTEGER, allowNull: true },
  projectId:      { type: DataTypes.INTEGER, allowNull: true },
  lossQty:        { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  operatorName:   { type: DataTypes.STRING(120) },
  machineLabel:   { type: DataTypes.STRING(120) },
  status: {
    type: DataTypes.ENUM('brouillon', 'validee', 'annulee', 'legacy'),
    defaultValue: 'legacy',
  },
  materialCost:     { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  laborCost:        { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  fuelCost:         { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  maintenanceCost:  { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  totalCost:        { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  yieldRatio:       { type: DataTypes.DECIMAL(8, 4) },
  finishedMaterialId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'production_entries', timestamps: true, paranoid: true });

module.exports = ProductionEntry;
