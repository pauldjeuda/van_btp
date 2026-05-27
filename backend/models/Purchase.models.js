const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ref: { type: DataTypes.STRING(50), unique: true },
  orderRef: { type: DataTypes.STRING(50), allowNull: true },
  item: { type: DataTypes.STRING(200), allowNull: false },
  designation: { type: DataTypes.TEXT },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit: { type: DataTypes.STRING(20) },
  unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  total: {
    type: DataTypes.VIRTUAL,
    get() { return parseFloat(this.quantity || 0) * parseFloat(this.unitPrice || 0); },
  },
  provider: { type: DataTypes.STRING(200) },
  status: {
    type: DataTypes.ENUM('En attente', 'Validé', 'Livré', 'Annulé'),
    defaultValue: 'En attente',
  },
  purchaseDate: { type: DataTypes.DATEONLY },
  deliveryDate: { type: DataTypes.DATEONLY },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  createdBy: { type: DataTypes.INTEGER },
}, { tableName: 'purchases', timestamps: true, paranoid: true });

module.exports = Purchase;
