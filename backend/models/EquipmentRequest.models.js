const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EquipmentRequest = sequelize.define('EquipmentRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ref: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  equipmentRequested: { type: DataTypes.STRING(200), allowNull: false },
  needDescription: { type: DataTypes.TEXT, allowNull: false },
  desiredDate: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('En attente', 'Approuvée', 'Rejetée', 'Annulée', 'Erreur envoi'),
    defaultValue: 'En attente',
  },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  requestedBy: { type: DataTypes.INTEGER, allowNull: true },
  requesterMatricule: { type: DataTypes.STRING(50), allowNull: true },
  requesterName: { type: DataTypes.STRING(200), allowNull: true },
  externalId: { type: DataTypes.STRING(100), allowNull: true },
  rejectionReason: { type: DataTypes.TEXT, allowNull: true },
  respondedAt: { type: DataTypes.DATE, allowNull: true },
  respondedBy: { type: DataTypes.STRING(100), allowNull: true },
  lastSyncAt: { type: DataTypes.DATE, allowNull: true },
  syncError: { type: DataTypes.TEXT, allowNull: true },
  logisticsDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const raw = this.getDataValue('logisticsDetails');
      if (raw == null) return null;
      if (typeof raw === 'object') return raw;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return null;
    },
    set(value) {
      this.setDataValue('logisticsDetails', value);
    },
  },
}, { tableName: 'equipment_requests', timestamps: true, paranoid: true });

module.exports = EquipmentRequest;
