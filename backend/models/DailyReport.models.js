const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DailyReport = sequelize.define('DailyReport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  status: {
    type: DataTypes.ENUM('Brouillon', 'Soumis', 'Validé'),
    defaultValue: 'Brouillon',
  },
  workDone: { type: DataTypes.TEXT },
  issuesEncountered: { type: DataTypes.TEXT },
  nextDayPlan: { type: DataTypes.TEXT },
  workerCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  reportDate: { type: DataTypes.DATEONLY, allowNull: false },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  reporterId: { type: DataTypes.INTEGER },
  reporter: { type: DataTypes.STRING },
}, { tableName: 'daily_reports', timestamps: true, paranoid: true });

module.exports = DailyReport;
