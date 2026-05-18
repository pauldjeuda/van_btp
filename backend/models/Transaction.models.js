const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Transaction = sequelize.define('Transaction', {
  id:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reference: { type: DataTypes.STRING(50), unique: true },
  type:      { type: DataTypes.ENUM('expense', 'invoice'), allowNull: false },
  category:  { type: DataTypes.STRING(100) },
  categorieFacture: {
    type: DataTypes.ENUM('Situation Travaux', 'Honoraires Études', 'Honoraires Réalisation', 'Décompte Final', 'Autre'),
    allowNull: true,
  },
  amount:    { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('En attente', 'Validé', 'Rejeté', 'Payé'),
    defaultValue: 'En attente',
  },
  paymentMethod: { type: DataTypes.STRING(50) },
  provider:      { type: DataTypes.STRING(200) },
  client:        { type: DataTypes.STRING(200) },
  description:   { type: DataTypes.TEXT },
  transactionDate: { type: DataTypes.DATEONLY, allowNull: false },
  dueDate:       { type: DataTypes.DATEONLY, allowNull: true },
  reminderCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  projectId:     { type: DataTypes.INTEGER, allowNull: false },
  createdBy:     { type: DataTypes.INTEGER },
  isClientDebt:  { type: DataTypes.BOOLEAN, defaultValue: false },
  debtStatus: {
    type: DataTypes.ENUM('Non remboursé', 'Partiellement remboursé', 'Remboursé'),
    defaultValue: 'Non remboursé',
    allowNull: true,
  },
  debtAmountPaid: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, { tableName: 'transactions', timestamps: true, paranoid: true });

module.exports = Transaction;
