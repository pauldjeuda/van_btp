const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Equipment = sequelize.define('Equipment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  ref: { type: DataTypes.STRING(50), unique: true },
  status: {
    type: DataTypes.ENUM('Disponible', 'En mission', 'En maintenance', 'En panne', 'Hors service'),
    defaultValue: 'Disponible',
  },
  // Localisation textuelle (ex: "Base Logistique", "Chantier Douala-Yaoundé")
  location: { type: DataTypes.STRING(255), allowNull: true },
  nextMaintenance: { type: DataTypes.DATEONLY },
  // FK vers Project courant
  projectId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'equipment', timestamps: true, paranoid: true });

module.exports = Equipment;
