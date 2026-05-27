const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductionEntryConsumption = sequelize.define('ProductionEntryConsumption', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entryId: { type: DataTypes.INTEGER, allowNull: false },
  materialId: { type: DataTypes.INTEGER, allowNull: false },
  quantityTheoretical: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
  quantityActual: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
  unitCost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  totalValue: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  stockMovementId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'production_entry_consumptions', timestamps: true });

module.exports = ProductionEntryConsumption;
