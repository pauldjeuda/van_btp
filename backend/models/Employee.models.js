const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Employee = sequelize.define('Employee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  matricule: { type: DataTypes.STRING(20), unique: true, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  role: { type: DataTypes.STRING(100), allowNull: false },
  contract: {
    type: DataTypes.ENUM('CDI', 'CDD', 'Intérim', 'Prestataire', 'Stage'),
    defaultValue: 'CDD',
  },
  niu: { type: DataTypes.STRING(30) },
  phone: { type: DataTypes.STRING(20) },
  // FK vers Project courant
  projectId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'employees', timestamps: true, paranoid: true });

module.exports = Employee;
