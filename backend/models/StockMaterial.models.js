const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockMaterial = sequelize.define('StockMaterial', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  category: {
    type: DataTypes.ENUM('Matériaux', 'Carburants', 'EPI', 'Outillage', 'Autre'),
    defaultValue: 'Matériaux',
  },
  unit: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'Unités' },
  alertThreshold: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  /** null = magasin central ; sinon catalogue du chantier */
  projectId: { type: DataTypes.INTEGER, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'stock_materials',
  timestamps: true,
  paranoid: true,
  indexes: [
    { unique: true, fields: ['name', 'projectId'], name: 'stock_materials_name_project_unique' },
  ],
});

module.exports = StockMaterial;
