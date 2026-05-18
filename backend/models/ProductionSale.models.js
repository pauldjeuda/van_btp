const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductionSale = sequelize.define('ProductionSale', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  productType: {
    type: DataTypes.ENUM('Parpaing', 'Pavé', 'Bordure', 'Hourdi', 'Autre'),
    allowNull: false,
  },
  productLabel:{ type: DataTypes.STRING(200) },
  quantity:    { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit:        { type: DataTypes.STRING(20), defaultValue: 'unité' },
  unitPrice:   { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  totalAmount: {
    type: DataTypes.VIRTUAL,
    get() { return parseFloat(this.quantity || 0) * parseFloat(this.unitPrice || 0); },
  },
  saleDate:    { type: DataTypes.DATEONLY, allowNull: false },
  client:      { type: DataTypes.STRING(200) },
  reference:   { type: DataTypes.STRING(100) },
  note:        { type: DataTypes.TEXT },
  createdBy:   { type: DataTypes.INTEGER },
}, { tableName: 'production_sales', timestamps: true, paranoid: true });

module.exports = ProductionSale;
