const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AccountingEntry = sequelize.define('AccountingEntry', {
  id:            { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  transactionId: { type: DataTypes.INTEGER, allowNull: true },
  projectId:     { type: DataTypes.INTEGER, allowNull: true },
  journalDate:   { type: DataTypes.DATEONLY, allowNull: false },
  label:         { type: DataTypes.STRING(255), allowNull: false },
  account:       { type: DataTypes.STRING(10), allowNull: false }, // 411, 706, 601, 401…
  accountLabel:  { type: DataTypes.STRING(100) },
  debit:         { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  credit:        { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  reference:     { type: DataTypes.STRING(50) },
  createdBy:     { type: DataTypes.INTEGER },
}, { tableName: 'accounting_entries', timestamps: true, updatedAt: false, paranoid: true });

module.exports = AccountingEntry;
