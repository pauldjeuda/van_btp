const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DebtRepayment = sequelize.define('DebtRepayment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  transactionId: { type: DataTypes.INTEGER, allowNull: false },
  amount:        { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  repaymentDate: { type: DataTypes.DATEONLY, allowNull: false },
  reference:     { type: DataTypes.STRING(100) },
  paymentMethod: { type: DataTypes.STRING(50), defaultValue: 'Virement' },
  note:          { type: DataTypes.TEXT },
  recordedBy:    { type: DataTypes.INTEGER },
}, { tableName: 'debt_repayments', timestamps: true, paranoid: true });

module.exports = DebtRepayment;
