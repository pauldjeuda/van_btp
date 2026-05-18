const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Document = sequelize.define('Document', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  type: {
    type: DataTypes.ENUM('Plan', 'Rapport', 'Contrat', 'Facture', 'Permis', 'Normes', 'Autre'),
    defaultValue: 'Autre',
  },
  filePath: { type: DataTypes.STRING(500), allowNull: false },
  fileSize: { type: DataTypes.STRING(20) },
  mimeType: { type: DataTypes.STRING(100) },
  projectId: { type: DataTypes.INTEGER, allowNull: true },
  uploadedBy: { type: DataTypes.INTEGER },
  uploadedByRole: { type: DataTypes.STRING(50) },
}, { tableName: 'documents', timestamps: true, paranoid: true });

module.exports = Document;
