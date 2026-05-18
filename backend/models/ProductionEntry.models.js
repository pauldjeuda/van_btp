const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductionEntry = sequelize.define('ProductionEntry', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productType: {
    type: DataTypes.ENUM('Parpaing', 'Pavé', 'Bordure', 'Hourdi', 'Autre'),
    allowNull: false,
  },
  productLabel:   { type: DataTypes.STRING(200) }, // ex: "Parpaing 15x20x40"
  quantity:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit:           { type: DataTypes.STRING(20), defaultValue: 'unité' },
  unitCost:       { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  productionDate: { type: DataTypes.DATEONLY, allowNull: false },
  note:           { type: DataTypes.TEXT },
  createdBy:      { type: DataTypes.INTEGER },
}, { tableName: 'production_entries', timestamps: true, paranoid: true });

module.exports = ProductionEntry;
