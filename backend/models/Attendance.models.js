const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attendance = sequelize.define('Attendance', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  employeeId:   { type: DataTypes.INTEGER, allowNull: false },
  projectId:    { type: DataTypes.INTEGER, allowNull: false },
  date:         { type: DataTypes.DATEONLY, allowNull: false },
  arrivalTime:  { type: DataTypes.STRING(5) },  // HH:MM
  departureTime:{ type: DataTypes.STRING(5) },  // HH:MM
  status: {
    type: DataTypes.ENUM('Présent', 'Absent', 'Retard', 'Demi-journée'),
    defaultValue: 'Présent',
  },
  lateMinutes:  { type: DataTypes.INTEGER, defaultValue: 0 },
  note:         { type: DataTypes.TEXT },
  recordedBy:   { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'attendances', timestamps: true, paranoid: true });

module.exports = Attendance;
