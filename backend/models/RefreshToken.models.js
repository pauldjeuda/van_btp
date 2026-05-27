/**
 * models/RefreshToken.models.js
 * Stocke les refresh tokens en base pour permettre révocation et rotation.
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING(512),
    allowNull: false,
    unique: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userRole: {
    type: DataTypes.ENUM('Directeur technique', 'Chef_chantier', 'Gerant_production', 'Gestionnaire de stocks'),
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  replacedByToken: {
    type: DataTypes.STRING(512),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  indexes: [
    { fields: ['token'] },
    { fields: ['userId', 'userRole'] },
    { fields: ['expiresAt'] },
  ],
});

module.exports = RefreshToken;
