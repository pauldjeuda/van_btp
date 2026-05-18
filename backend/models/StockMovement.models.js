const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockMovement = sequelize.define('StockMovement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type: { type: DataTypes.ENUM('Entrée', 'Sortie', 'Transfert'), allowNull: false },
  item: { type: DataTypes.STRING(200), allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit: { type: DataTypes.STRING(20) },
  movementDate: { type: DataTypes.DATEONLY, allowNull: false },
  // Magasin source / destination
  warehouse: { type: DataTypes.STRING(100), defaultValue: 'Magasin Principal' },
  projectId: { type: DataTypes.INTEGER, allowNull: true },
  createdBy: { type: DataTypes.INTEGER },
  note: { type: DataTypes.TEXT },
}, { tableName: 'stock_movements', timestamps: true, paranoid: true });

module.exports = StockMovement;
